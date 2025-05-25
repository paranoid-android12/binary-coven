import { ExecutionContext, ExecutionResult, CodeWindow } from '../../types/game';
import { BuiltInFunctionRegistry } from './BuiltInFunctions';
import { GridSystem } from './GridSystem';
import { useGameStore } from '../../stores/gameStore';

interface CodeExecutionState {
  isRunning: boolean;
  currentLine: number;
  variables: Record<string, any>;
  callStack: Array<{
    functionName: string;
    line: number;
    variables: Record<string, any>;
  }>;
}

export class CodeExecutor {
  private context: ExecutionContext;
  private gridSystem: GridSystem;
  private executionState: CodeExecutionState;
  private userFunctions: Map<string, CodeWindow> = new Map();

  constructor(context: ExecutionContext, gridSystem: GridSystem) {
    this.context = context;
    this.gridSystem = gridSystem;
    this.executionState = {
      isRunning: false,
      currentLine: 0,
      variables: {},
      callStack: []
    };
  }

  // Set user-defined functions (from code windows)
  setUserFunctions(codeWindows: Map<string, CodeWindow>) {
    this.userFunctions.clear();
    codeWindows.forEach((window, id) => {
      this.userFunctions.set(window.name, window);
    });
  }

  // Main execution entry point
  async executeMain(): Promise<ExecutionResult> {
    const mainFunction = this.userFunctions.get('main');
    
    if (!mainFunction) {
      return {
        success: false,
        message: 'No main function found'
      };
    }

    this.executionState.isRunning = true;
    this.executionState.variables = { ...this.context.globalVariables };

    try {
      const result = await this.executeFunction('main', []);
      this.executionState.isRunning = false;
      return result;
    } catch (error) {
      this.executionState.isRunning = false;
      return {
        success: false,
        message: `Execution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Execute a specific function
  async executeFunction(functionName: string, args: any[]): Promise<ExecutionResult> {
    // Check if entity is blocked by a task
    const store = useGameStore.getState();
    const currentEntity = store.entities.get(this.context.entity.id);
    if (currentEntity?.taskState.isBlocked) {
      return {
        success: false,
        message: `Entity is currently busy: ${currentEntity.taskState.progress?.description || 'Unknown task'}`
      };
    }

    // Check if it's a built-in function
    const builtInFunction = BuiltInFunctionRegistry.getFunction(functionName);
    if (builtInFunction) {
      const result = await builtInFunction.execute(this.context, ...args);
      
      // Handle energy consumption if the function has an energy cost
      if (result.success && result.energyCost && result.energyCost > 0) {
        const currentEntity = store.entities.get(this.context.entity.id);
        if (currentEntity && currentEntity.stats.energy >= result.energyCost) {
          // Consume energy
          store.updateEntity(this.context.entity.id, {
            stats: {
              ...currentEntity.stats,
              energy: currentEntity.stats.energy - result.energyCost
            }
          });
          
          // Update context entity
          this.context.entity.stats.energy = currentEntity.stats.energy - result.energyCost;
        } else {
          return {
            success: false,
            message: `Not enough energy. Required: ${result.energyCost}, Available: ${currentEntity?.stats.energy || 0}`
          };
        }
      }
      
      // Handle duration (for animations/timing)
      if (result.success && result.duration && result.duration > 0) {
        // Add a small delay to make movement visible
        await new Promise(resolve => setTimeout(resolve, Math.min(result.duration || 0, 500)));
      }
      
      return result;
    }

    // Check if it's a grid function
    const currentGrid = store.getGridAt(this.context.entity.position);
    if (currentGrid) {
      const gridFunction = currentGrid.functions.find(f => f.name === functionName);
      if (gridFunction) {
        // Get fresh entity data
        const freshEntity = store.entities.get(this.context.entity.id);
        if (!freshEntity) {
          return {
            success: false,
            message: 'Entity not found'
          };
        }

        const result = await gridFunction.execute(freshEntity, args, currentGrid);
        
        // Update context entity with fresh data after grid function execution
        const updatedEntity = store.entities.get(this.context.entity.id);
        if (updatedEntity) {
          this.context.entity = updatedEntity;
        }
        
        return result;
      }
    }

    // Check if it's a user-defined function
    const userFunction = this.userFunctions.get(functionName);
    if (userFunction) {
      return await this.executeUserFunction(userFunction, args);
    }

    return {
      success: false,
      message: `Function '${functionName}' not found`
    };
  }

  // Execute user-defined function
  private async executeUserFunction(codeWindow: CodeWindow, args: any[]): Promise<ExecutionResult> {
    const lines = this.parseCode(codeWindow.code);
    const functionScope = { ...this.executionState.variables };

    // Add function to call stack
    this.executionState.callStack.push({
      functionName: codeWindow.name,
      line: 0,
      variables: functionScope
    });

    try {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line || line.startsWith('#')) continue; // Skip empty lines and comments

        const result = await this.executeLine(line, functionScope);
        if (!result.success) {
          return result;
        }

        // Handle control flow
        if (result.data?.controlFlow === 'return') {
          break;
        }
      }

      // Remove from call stack
      this.executionState.callStack.pop();

      return {
        success: true,
        message: `Function ${codeWindow.name} executed successfully`
      };
    } catch (error) {
      this.executionState.callStack.pop();
      return {
        success: false,
        message: `Error in ${codeWindow.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Execute a single line of code
  private async executeLine(line: string, scope: Record<string, any>): Promise<ExecutionResult> {
    line = line.trim();

    // Handle function definitions (skip them as they're already registered)
    if (line.startsWith('def ')) {
      return { success: true, message: 'Function definition processed' };
    }

    // Handle variable assignments
    if (line.includes('=') && !line.includes('==')) {
      return this.executeAssignment(line, scope);
    }

    // Handle control structures
    if (line.startsWith('if ')) {
      return this.executeIf(line, scope);
    }

    if (line.startsWith('for ')) {
      return this.executeFor(line, scope);
    }

    if (line.startsWith('while ')) {
      return this.executeWhile(line, scope);
    }

    if (line.startsWith('return')) {
      return {
        success: true,
        message: 'Return statement executed',
        data: { controlFlow: 'return' }
      };
    }

    // Handle function calls
    if (line.includes('(') && line.includes(')')) {
      return this.executeFunctionCall(line, scope);
    }

    return {
      success: true,
      message: `Processed line: ${line}`
    };
  }

  // Execute variable assignment
  private executeAssignment(line: string, scope: Record<string, any>): ExecutionResult {
    try {
      const [varName, expression] = line.split('=').map(s => s.trim());
      const value = this.evaluateExpression(expression, scope);
      scope[varName] = value;
      this.executionState.variables[varName] = value;

      return {
        success: true,
        message: `Assigned ${varName} = ${value}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Assignment error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Execute function call
  private async executeFunctionCall(line: string, scope: Record<string, any>): Promise<ExecutionResult> {
    try {
      const match = line.match(/(\w+)\((.*)\)/);
      if (!match) {
        return {
          success: false,
          message: 'Invalid function call syntax'
        };
      }

      const [, functionName, argsString] = match;
      const args = argsString ? this.parseArguments(argsString, scope) : [];

      return await this.executeFunction(functionName, args);
    } catch (error) {
      return {
        success: false,
        message: `Function call error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Parse code into lines (simplified)
  private parseCode(code: string): string[] {
    return code.split('\n').map(line => line.trim()).filter(line => line.length > 0);
  }

  // Parse function arguments
  private parseArguments(argsString: string, scope: Record<string, any>): any[] {
    if (!argsString.trim()) return [];

    return argsString.split(',').map(arg => {
      return this.evaluateExpression(arg.trim(), scope);
    });
  }

  // Evaluate expressions (simplified)
  private evaluateExpression(expression: string, scope: Record<string, any>): any {
    expression = expression.trim();

    // Handle string literals
    if ((expression.startsWith('"') && expression.endsWith('"')) ||
        (expression.startsWith("'") && expression.endsWith("'"))) {
      return expression.slice(1, -1);
    }

    // Handle numbers
    if (!isNaN(Number(expression))) {
      return Number(expression);
    }

    // Handle booleans
    if (expression === 'True' || expression === 'true') return true;
    if (expression === 'False' || expression === 'false') return false;
    if (expression === 'None' || expression === 'null') return null;

    // Handle variables
    if (scope.hasOwnProperty(expression)) {
      return scope[expression];
    }

    // Handle simple arithmetic (very basic)
    if (expression.includes('+') || expression.includes('-') || 
        expression.includes('*') || expression.includes('/')) {
      try {
        // This is unsafe in production - use a proper expression parser
        return Function('"use strict"; return (' + expression + ')')();
      } catch {
        return expression; // Return as string if evaluation fails
      }
    }

    return expression; // Default to string
  }

  // Simplified control flow handlers
  private executeIf(line: string, scope: Record<string, any>): ExecutionResult {
    // This is a simplified implementation
    // In a full implementation, you'd need proper parsing of if/else blocks
    return {
      success: true,
      message: 'If statement processed (simplified)'
    };
  }

  private executeFor(line: string, scope: Record<string, any>): ExecutionResult {
    return {
      success: true,
      message: 'For loop processed (simplified)'
    };
  }

  private executeWhile(line: string, scope: Record<string, any>): ExecutionResult {
    return {
      success: true,
      message: 'While loop processed (simplified)'
    };
  }

  // Stop execution
  stop(): void {
    this.executionState.isRunning = false;
  }

  // Get current execution state
  getExecutionState(): CodeExecutionState {
    return { ...this.executionState };
  }
} 