import { ExecutionContext, ExecutionResult, CodeWindow } from '../../types/game';
import { BuiltInFunctionRegistry } from './BuiltInFunctions';
import GridSystem from './GridSystem';
import { useGameStore } from '../../stores/gameStore';
import { EventBus } from '../EventBus';

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

interface ParsedLine {
  content: string;
  indentLevel: number;
  lineNumber: number;
}

interface CodeBlock {
  lines: ParsedLine[];
  startLine: number;
  endLine: number;
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
    console.log('[DEBUG] setUserFunctions: Received codeWindows:', codeWindows.size);
    codeWindows.forEach((window, id) => {
      console.log('[DEBUG] setUserFunctions: Adding function:', window.name, 'isMain:', window.isMain);
      this.userFunctions.set(window.name, window);
    });
    console.log('[DEBUG] setUserFunctions: Final userFunctions:', Array.from(this.userFunctions.keys()));
  }

  // Main execution entry point
  async executeMain(): Promise<ExecutionResult> {
    console.log('[DEBUG] executeMain: Method called, starting execution');
    console.log('[DEBUG] executeMain: Looking for main function. Available functions:', Array.from(this.userFunctions.keys()));
    const mainFunction = this.userFunctions.get('main');
    
    if (!mainFunction) {
      console.log('[DEBUG] executeMain: No main function found!');
      return {
        success: false,
        message: 'No main function found'
      };
    }
    
    console.log('[DEBUG] executeMain: Found main function:', mainFunction.name, 'Code length:', mainFunction.code.length);

    // Debug: Check initial entity state
    const store = useGameStore.getState();
    const initialEntity = store.entities.get(this.context.entity.id);
    console.log(`[DEBUG] Starting executeMain - Entity state:`, {
      id: this.context.entity.id,
      blocked: initialEntity?.taskState.isBlocked,
      task: initialEntity?.taskState.currentTask,
      description: initialEntity?.taskState.progress?.description
    });

    this.executionState.isRunning = true;
    this.executionState.variables = { ...this.context.globalVariables };

    try {
      console.log('[DEBUG] executeMain: About to call executeFunction("main", [])');
      const result = await this.executeFunction('main', []);
      console.log('[DEBUG] executeMain: executeFunction returned:', result);
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
    
    console.log(`[FUNCTION-LOOKUP] Executing function: ${functionName}, Entity blocked: ${currentEntity?.taskState.isBlocked}, Task: ${currentEntity?.taskState.progress?.description || 'none'}`);
    
    if (currentEntity?.taskState.isBlocked) {
      return {
        success: false,
        message: `Entity is currently busy: ${currentEntity.taskState.progress?.description || 'Unknown task'}`
      };
    }

    // Check if it's a built-in function
    console.log(`[FUNCTION-LOOKUP] Looking for built-in function: ${functionName}`);
    console.log(`[FUNCTION-LOOKUP] Available built-in functions:`, BuiltInFunctionRegistry.getFunctionNames());
    const builtInFunction = BuiltInFunctionRegistry.getFunction(functionName);
    console.log(`[FUNCTION-LOOKUP] Built-in function found:`, !!builtInFunction);
    if (builtInFunction) {
      const result = await builtInFunction.execute(this.context, ...args);
      
      // Handle energy consumption if the function has an energy cost
      // BUT skip energy consumption if player is on a Challenge Grid
      const isOnChallengeGrid = store.isPlayerOnChallengeGrid();
      
      if (result.success && result.energyCost && result.energyCost > 0 && !isOnChallengeGrid) {
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
      } else if (result.success && result.energyCost && result.energyCost > 0 && isOnChallengeGrid) {
        // Log that energy was not consumed due to Challenge Grid
        console.log('[CHALLENGE] Energy consumption skipped - on Challenge Grid');
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
        
        // Add blocksEntity flag from grid function definition to the result
        if (gridFunction.blocksEntity && result.success) {
          result.blocksEntity = true;
        }
        
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
    const parsedLines = this.parseCodeWithIndentation(codeWindow.code);
    const functionScope = { ...this.executionState.variables };

    // Add function to call stack
    this.executionState.callStack.push({
      functionName: codeWindow.name,
      line: 0,
      variables: functionScope
    });

    try {
      const result = await this.executeBlock(parsedLines, functionScope);
      
      // Remove from call stack
      this.executionState.callStack.pop();

      return result;
    } catch (error) {
      // Remove from call stack on error
      this.executionState.callStack.pop();
      
      return {
        success: false,
        message: `Function '${codeWindow.name}' error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Execute a block of parsed lines
  private async executeBlock(lines: ParsedLine[], scope: Record<string, any>): Promise<ExecutionResult> {
    for (let i = 0; i < lines.length; i++) {
      if (!this.executionState.isRunning) {
        return { success: false, message: 'Execution stopped' };
      }

      const line = lines[i];
      if (!line.content || line.content.startsWith('#')) continue; // Skip empty lines and comments

      const result = await this.executeLine(line, lines, i, scope);
      if (!result.success) {
        return result;
      }

      // Handle control flow
      if (result.data?.controlFlow === 'return') {
        return result;
      }
      if (result.data?.controlFlow === 'break') {
        return { success: true, data: { controlFlow: 'break' } };
      }
      if (result.data?.controlFlow === 'continue') {
        return { success: true, data: { controlFlow: 'continue' } };
      }
      if (result.data?.skipToLine !== undefined) {
        i = result.data.skipToLine - 1; // -1 because loop will increment
      }
    }

    return { success: true, message: 'Block executed successfully' };
  }

  // Execute a single line of code
  private async executeLine(line: ParsedLine, allLines: ParsedLine[], lineIndex: number, scope: Record<string, any>): Promise<ExecutionResult> {
    const content = line.content.trim();

    // Update execution state and emit current line event
    this.executionState.currentLine = line.lineNumber;
    
    // Get current function name from call stack
    const currentFunction = this.executionState.callStack.length > 0 
      ? this.executionState.callStack[this.executionState.callStack.length - 1].functionName
      : 'main';
    
    // Emit execution state event for UI to display
    EventBus.emit('code-execution-line', {
      line: content,
      lineNumber: line.lineNumber,
      functionName: currentFunction,
      entityId: this.context.entity.id
    });

    // Handle function definitions (skip them as they're already registered)
    if (content.startsWith('def ')) {
      return { success: true, message: 'Function definition processed' };
    }

    // Handle variable assignments
    if (content.includes('=') && !content.includes('==') && !content.includes('!=') && !content.includes('<=') && !content.includes('>=')) {
      return this.executeAssignment(content, scope);
    }

    // Handle control structures
    if (content.startsWith('if ')) {
      return await this.executeIf(line, allLines, lineIndex, scope);
    }

    if (content.startsWith('elif ')) {
      return { success: true, message: 'Elif statement processed' }; // Handled by executeIf
    }

    if (content.startsWith('else:')) {
      return { success: true, message: 'Else statement processed' }; // Handled by executeIf
    }

    if (content.startsWith('for ')) {
      return await this.executeFor(line, allLines, lineIndex, scope);
    }

    if (content.startsWith('while ')) {
      return await this.executeWhile(line, allLines, lineIndex, scope);
    }

    if (content.startsWith('return')) {
      return {
        success: true,
        message: 'Return statement executed',
        data: { controlFlow: 'return' }
      };
    }

    if (content.startsWith('break')) {
      return {
        success: true,
        message: 'Break statement executed',
        data: { controlFlow: 'break' }
      };
    }

    if (content.startsWith('continue')) {
      return {
        success: true,
        message: 'Continue statement executed',
        data: { controlFlow: 'continue' }
      };
    }

    // Handle function calls
    if (content.includes('(') && content.includes(')')) {
      return this.executeFunctionCall(content, scope);
    }

    return {
      success: true,
      message: `Processed line: ${content}`
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

      // Emit function call event for UI
      EventBus.emit('code-execution-function-call', {
        functionName,
        args,
        entityId: this.context.entity.id
      });

      const result = await this.executeFunction(functionName, args);
      
      console.log(`[DEBUG] Function ${functionName} result:`, result);
      
      // If the function blocks the entity, wait until the entity is no longer blocked
      if (result.success && result.blocksEntity) {
        console.log(`Function ${functionName} blocks entity, waiting for completion...`);
        await this.waitForEntityUnblocked();
        
        // Refresh the context entity state after waiting
        const store = useGameStore.getState();
        const freshEntity = store.entities.get(this.context.entity.id);
        if (freshEntity) {
          this.context.entity = freshEntity;
          console.log(`Entity is now unblocked, context updated. Entity blocked: ${freshEntity.taskState.isBlocked}`);
        }
        console.log(`Continuing execution...`);
      }
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: `Function call error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  // Wait for the entity to become unblocked
  private async waitForEntityUnblocked(): Promise<void> {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      const maxWaitTime = 30000; // 30 seconds maximum wait time
      
      const checkBlocked = () => {
        const store = useGameStore.getState();
        const currentEntity = store.entities.get(this.context.entity.id);
        
        console.log(`Checking entity blocked status: ${currentEntity?.taskState.isBlocked}, Task: ${currentEntity?.taskState.progress?.description || 'none'}`);
        
        // Check if we've been waiting too long
        if (Date.now() - startTime > maxWaitTime) {
          console.warn('Entity blocking timeout - continuing execution anyway');
          resolve();
          return;
        }
        
        if (!currentEntity?.taskState.isBlocked) {
          // Entity is no longer blocked, wait a tiny bit more to ensure state consistency
          console.log('Entity is now unblocked! Waiting 50ms for state to propagate...');
          setTimeout(() => {
            resolve();
          }, 50);
        } else {
          // Still blocked, check again in 100ms
          setTimeout(checkBlocked, 100);
        }
      };
      
      // Start checking
      checkBlocked();
    });
  }

  // Parse code into lines with indentation information
  private parseCodeWithIndentation(code: string): ParsedLine[] {
    const lines = code.split('\n');
    const parsedLines: ParsedLine[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const content = line.trimEnd(); // Keep leading whitespace for indentation
      
      if (content.trim().length === 0) continue; // Skip empty lines
      
      // Calculate indentation level (assuming 4 spaces = 1 level, or 1 tab = 1 level)
      const match = content.match(/^(\s*)/);
      const whitespace = match ? match[1] : '';
      const indentLevel = whitespace.replace(/\t/g, '    ').length / 4; // Convert tabs to spaces
      
      parsedLines.push({
        content: content.trim(),
        indentLevel: Math.floor(indentLevel),
        lineNumber: i + 1
      });
    }

    return parsedLines;
  }

  // Get code block for control structures
  private getCodeBlock(allLines: ParsedLine[], startIndex: number): CodeBlock {
    const currentIndent = allLines[startIndex].indentLevel;
    const blockLines: ParsedLine[] = [];
    let endIndex = startIndex + 1;

    // Find all lines that belong to this block (have greater indentation)
    for (let i = startIndex + 1; i < allLines.length; i++) {
      const line = allLines[i];
      
      // If we hit a line with same or less indentation, the block ends
      if (line.indentLevel <= currentIndent) {
        break;
      }
      
      blockLines.push(line);
      endIndex = i;
    }

    return {
      lines: blockLines,
      startLine: startIndex + 1,
      endLine: endIndex
    };
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

  // Evaluate expressions with comparison operators
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

    // Handle function calls that return values (like range())
    if (expression.includes('(') && expression.includes(')')) {
      const match = expression.match(/(\w+)\((.*)\)/);
      if (match) {
        const [, functionName, argsString] = match;
        
        // Check if it's a built-in function that returns a value
        const builtInFunction = BuiltInFunctionRegistry.getFunction(functionName);
        if (builtInFunction) {
          try {
            const args = argsString ? this.parseArguments(argsString, scope) : [];
            // For synchronous evaluation, we need to handle async functions differently
            // This is a simplified version - in practice, you might need to handle this differently
            if (functionName === 'range') {
              return this.handleRangeFunction(args);
            } else if (functionName === 'len') {
              return this.handleLenFunction(args, scope);
            } else if (functionName === 'abs') {
              return this.handleAbsFunction(args);
            } else if (functionName === 'min') {
              return this.handleMinFunction(args);
            } else if (functionName === 'max') {
              return this.handleMaxFunction(args);
            } else if (functionName === 'can_harvest') {
              return this.handleCanHarvestFunction();
            }
          } catch (error) {
            console.warn(`Error evaluating function ${functionName}:`, error);
            return expression; // Return original expression if function evaluation fails
          }
        }
      }
    }

    // Handle comparison operators
    const comparisons = ['<=', '>=', '==', '!=', '<', '>'];
    for (const op of comparisons) {
      if (expression.includes(op)) {
        const parts = expression.split(op).map(p => p.trim());
        if (parts.length === 2) {
          const left = this.evaluateExpression(parts[0], scope);
          const right = this.evaluateExpression(parts[1], scope);
          
          switch (op) {
            case '==': return left === right;
            case '!=': return left !== right;
            case '<': return left < right;
            case '>': return left > right;
            case '<=': return left <= right;
            case '>=': return left >= right;
          }
        }
      }
    }

    // Handle logical operators
    if (expression.includes(' and ')) {
      const parts = expression.split(' and ').map(p => p.trim());
      return parts.every(part => this.isTruthy(this.evaluateExpression(part, scope)));
    }
    
    if (expression.includes(' or ')) {
      const parts = expression.split(' or ').map(p => p.trim());
      return parts.some(part => this.isTruthy(this.evaluateExpression(part, scope)));
    }

    if (expression.startsWith('not ')) {
      const innerExpression = expression.substring(4).trim();
      return !this.isTruthy(this.evaluateExpression(innerExpression, scope));
    }

    // Handle variables
    if (scope.hasOwnProperty(expression)) {
      return scope[expression];
    }

    // Handle simple arithmetic (very basic)
    if (expression.includes('+') || expression.includes('-') || 
        expression.includes('*') || expression.includes('/')) {
      try {
        // Replace variables with their values
        let evalExpression = expression;
        for (const [varName, value] of Object.entries(scope)) {
          const regex = new RegExp(`\\b${varName}\\b`, 'g');
          evalExpression = evalExpression.replace(regex, String(value));
        }
        // This is unsafe in production - use a proper expression parser
        return Function('"use strict"; return (' + evalExpression + ')')();
      } catch {
        return expression; // Return as string if evaluation fails
      }
    }

    return expression; // Default to string
  }

  // Helper functions for synchronous built-in function evaluation
  private handleRangeFunction(args: any[]): any[] {
    let start: number, stop: number, step: number;
    
    if (args.length === 1) {
      start = 0;
      stop = Number(args[0]);
      step = 1;
    } else if (args.length === 2) {
      start = Number(args[0]);
      stop = Number(args[1]);
      step = 1;
    } else if (args.length === 3) {
      start = Number(args[0]);
      stop = Number(args[1]);
      step = Number(args[2]);
    } else {
      throw new Error('range() takes 1 to 3 arguments');
    }
    
    if (step === 0) {
      throw new Error('range() step argument must not be zero');
    }
    
    const result: number[] = [];
    if (step > 0) {
      for (let i = start; i < stop; i += step) {
        result.push(i);
      }
    } else {
      for (let i = start; i > stop; i += step) {
        result.push(i);
      }
    }
    
    return result;
  }

  private handleLenFunction(args: any[], scope: Record<string, any>): number {
    if (args.length !== 1) {
      throw new Error('len() takes exactly one argument');
    }
    
    const value = args[0];
    
    if (typeof value === 'string') {
      return value.length;
    } else if (Array.isArray(value)) {
      return value.length;
    } else if (value != null && typeof value.length === 'number') {
      return value.length;
    } else {
      throw new Error(`Object of type '${typeof value}' has no len()`);
    }
  }

  private handleAbsFunction(args: any[]): number {
    if (args.length !== 1) {
      throw new Error('abs() takes exactly one argument');
    }
    
    const value = Number(args[0]);
    if (isNaN(value)) {
      throw new Error('abs() requires a number argument');
    }
    
    return Math.abs(value);
  }

  private handleMinFunction(args: any[]): number {
    if (args.length === 0) {
      throw new Error('min() expected at least 1 argument, got 0');
    }
    
    let values: any[];
    if (args.length === 1 && Array.isArray(args[0])) {
      values = args[0];
    } else {
      values = args;
    }
    
    const numbers = values.map(v => Number(v));
    if (numbers.some(n => isNaN(n))) {
      throw new Error('min() arguments must be numbers');
    }
    
    return Math.min(...numbers);
  }

  private handleMaxFunction(args: any[]): number {
    if (args.length === 0) {
      throw new Error('max() expected at least 1 argument, got 0');
    }
    
    let values: any[];
    if (args.length === 1 && Array.isArray(args[0])) {
      values = args[0];
    } else {
      values = args;
    }
    
    const numbers = values.map(v => Number(v));
    if (numbers.some(n => isNaN(n))) {
      throw new Error('max() arguments must be numbers');
    }
    
    return Math.max(...numbers);
  }

  private handleCanHarvestFunction(): boolean {
    // Get the current game store state
    const store = useGameStore.getState();
    
    // Get the latest entity data
    const currentEntity = store.entities.get(this.context.entity.id);
    if (!currentEntity) {
      return false;
    }
    
    // Get the grid at the entity's current position
    const grid = store.getGridAt(currentEntity.position);
    
    // Return false if no grid found at current position
    if (!grid) {
      return false;
    }
    
    // Return false if not standing on farmland
    if (grid.type !== 'farmland') {
      return false;
    }
    
    // Check if farmland has crops ready for harvest
    // A farmland can be harvested if:
    // 1. It has the status 'ready' (meaning crops are fully grown)
    // 2. There's no active task blocking it
    const canHarvest = grid.state.status === 'ready' && !grid.taskState.isBlocked;
    
    return canHarvest;
  }

  // Check if a value is truthy (Python-like truthiness)
  private isTruthy(value: any): boolean {
    if (value === null || value === undefined) return false;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value !== 0;
    if (typeof value === 'string') return value.length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return !!value;
  }

  // Execute if statement with elif and else support
  private async executeIf(line: ParsedLine, allLines: ParsedLine[], lineIndex: number, scope: Record<string, any>): Promise<ExecutionResult> {
    const content = line.content;
    
    // Parse the condition
    const match = content.match(/^if\s+(.+):\s*$/);
    if (!match) {
      return {
        success: false,
        message: 'Invalid if statement syntax. Expected: if condition:'
      };
    }

    const condition = match[1];
    const conditionResult = this.evaluateExpression(condition, scope);
    
    // Get the if block
    const ifBlock = this.getCodeBlock(allLines, lineIndex);
    let skipToLine = ifBlock.endLine;
    
    // Check for elif and else statements
    let elseBlock: CodeBlock | null = null;
    let currentIndex = ifBlock.endLine + 1;
    
    while (currentIndex < allLines.length) {
      const nextLine = allLines[currentIndex];
      
      if (nextLine.indentLevel !== line.indentLevel) {
        break; // Different indentation level, no more elif/else
      }
      
      if (nextLine.content.startsWith('elif ')) {
        // Handle elif
        const elifMatch = nextLine.content.match(/^elif\s+(.+):\s*$/);
        if (!elifMatch) {
          return {
            success: false,
            message: 'Invalid elif statement syntax. Expected: elif condition:'
          };
        }
        
        const elifBlock = this.getCodeBlock(allLines, currentIndex);
        skipToLine = elifBlock.endLine;
        
        if (!this.isTruthy(conditionResult)) {
          const elifCondition = elifMatch[1];
          const elifResult = this.evaluateExpression(elifCondition, scope);
          
          if (this.isTruthy(elifResult)) {
            // Execute elif block
            const result = await this.executeBlock(elifBlock.lines, scope);
            return {
              ...result,
              data: { ...result.data, skipToLine }
            };
          }
        }
        
        currentIndex = elifBlock.endLine + 1;
      } else if (nextLine.content === 'else:') {
        // Handle else
        elseBlock = this.getCodeBlock(allLines, currentIndex);
        skipToLine = elseBlock.endLine;
        break;
      } else {
        break; // Not an elif or else, stop looking
      }
    }
    
    if (this.isTruthy(conditionResult)) {
      // Execute if block
      const result = await this.executeBlock(ifBlock.lines, scope);
      return {
        ...result,
        data: { ...result.data, skipToLine }
      };
    } else if (elseBlock) {
      // Execute else block
      const result = await this.executeBlock(elseBlock.lines, scope);
      return {
        ...result,
        data: { ...result.data, skipToLine }
      };
    }
    
    // No condition was true, skip to end
    return {
      success: true,
      message: 'If statement processed (no condition met)',
      data: { skipToLine }
    };
  }

  // Execute for loop
  private async executeFor(line: ParsedLine, allLines: ParsedLine[], lineIndex: number, scope: Record<string, any>): Promise<ExecutionResult> {
    const content = line.content;
    
    // Parse the for loop
    const match = content.match(/^for\s+(\w+)\s+in\s+(.+):\s*$/);
    if (!match) {
      return {
        success: false,
        message: 'Invalid for loop syntax. Expected: for variable in iterable:'
      };
    }

    const [, variable, iterableExpression] = match;
    const iterable = this.evaluateExpression(iterableExpression, scope);
    
    // Get the loop block
    const loopBlock = this.getCodeBlock(allLines, lineIndex);
    
    // Handle different types of iterables
    let items: any[] = [];
    
    if (Array.isArray(iterable)) {
      items = iterable;
    } else if (typeof iterable === 'string') {
      items = Array.from(iterable); // String characters
    } else if (typeof iterable === 'number') {
      // Handle range-like syntax: for i in 5 -> [0, 1, 2, 3, 4]
      if (iterable >= 0) {
        items = Array.from({ length: Math.floor(iterable) }, (_, i) => i);
      } else {
        return {
          success: false,
          message: 'Cannot iterate over negative number'
        };
      }
    } else {
      return {
        success: false,
        message: `Cannot iterate over ${typeof iterable}: ${iterable}`
      };
    }
    
    // Execute the loop
    for (const item of items) {
      if (!this.executionState.isRunning) {
        return { success: false, message: 'Execution stopped' };
      }
      
      // Set the loop variable
      scope[variable] = item;
      
      // Execute the loop body
      const result = await this.executeBlock(loopBlock.lines, scope);
      
      if (!result.success) {
        return result;
      }
      
      // Handle control flow
      if (result.data?.controlFlow === 'break') {
        break;
      }
      if (result.data?.controlFlow === 'continue') {
        continue;
      }
      if (result.data?.controlFlow === 'return') {
        return result;
      }
    }
    
    return {
      success: true,
      message: `For loop completed (${items.length} iterations)`,
      data: { skipToLine: loopBlock.endLine }
    };
  }

  // Execute while loop
  private async executeWhile(line: ParsedLine, allLines: ParsedLine[], lineIndex: number, scope: Record<string, any>): Promise<ExecutionResult> {
    const content = line.content;
    
    // Parse the while loop
    const match = content.match(/^while\s+(.+):\s*$/);
    if (!match) {
      return {
        success: false,
        message: 'Invalid while loop syntax. Expected: while condition:'
      };
    }

    const condition = match[1];
    
    // Get the loop block
    const loopBlock = this.getCodeBlock(allLines, lineIndex);
    
    let iterations = 0;
    const maxIterations = 10000; // Prevent infinite loops
    
    // Execute the loop
    while (this.isTruthy(this.evaluateExpression(condition, scope))) {
      if (!this.executionState.isRunning) {
        return { success: false, message: 'Execution stopped' };
      }
      
      if (iterations >= maxIterations) {
        return {
          success: false,
          message: `While loop exceeded maximum iterations (${maxIterations}). Possible infinite loop.`
        };
      }
      
      iterations++;
      
      // Execute the loop body
      const result = await this.executeBlock(loopBlock.lines, scope);
      
      if (!result.success) {
        return result;
      }
      
      // Handle control flow
      if (result.data?.controlFlow === 'break') {
        break;
      }
      if (result.data?.controlFlow === 'continue') {
        continue;
      }
      if (result.data?.controlFlow === 'return') {
        return result;
      }
    }
    
    return {
      success: true,
      message: `While loop completed (${iterations} iterations)`,
      data: { skipToLine: loopBlock.endLine }
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