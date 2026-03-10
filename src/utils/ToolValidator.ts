import { Tool } from '../core/ToolRegistry';

export class ToolValidator {
    /**
     * Crude schema validator for tool arguments.
     * Checks for required properties and basic types.
     */
    static validate(tool: Tool, args: any): { valid: boolean; error?: string } {
        if (!tool.parameters || !tool.parameters.required) {
            return { valid: true };
        }

        for (const requiredField of tool.parameters.required) {
            if (args[requiredField] === undefined || args[requiredField] === null) {
                return {
                    valid: false,
                    error: `Missing required parameter: '${requiredField}' for tool '${tool.name}'`
                };
            }
        }

        // Basic type checking if properties are defined
        if (tool.parameters.properties) {
            for (const [key, value] of Object.entries(args)) {
                const schema = tool.parameters.properties[key];
                if (schema && schema.type) {
                    const actualType = typeof value;
                    if (schema.type === 'number' && actualType !== 'number') {
                        return { valid: false, error: `Parameter '${key}' expected type 'number', got '${actualType}'` };
                    }
                    if (schema.type === 'string' && actualType !== 'string') {
                        return { valid: false, error: `Parameter '${key}' expected type 'string', got '${actualType}'` };
                    }
                    if (schema.type === 'boolean' && actualType !== 'boolean') {
                        return { valid: false, error: `Parameter '${key}' expected type 'boolean', got '${actualType}'` };
                    }
                }
            }
        }

        return { valid: true };
    }
}
