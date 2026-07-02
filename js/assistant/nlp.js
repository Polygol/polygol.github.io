export class AssistantNLP {
    parseNumber(text) {
        const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
        const map = {
            '1': 0, 'one': 0, 'won': 0,
            '2': 1, 'two': 1, 'to': 1, 'too': 1,
            '3': 2, 'three': 2, 'tree': 2,
            '4': 3, 'four': 3, 'for': 3,
            '5': 4, 'five': 4
        };
        if (map[clean] !== undefined) return map[clean];
        return null;
    }

    parse(text) {
        const intents = window.ActivityIntents || [];
        const lowerText = text.toLowerCase();
        
        // 1. Check registered 3rd party Gurapp Intents
        for (const intent of intents) {
            for (const keyword of intent.keywords) {
                if (lowerText.includes(keyword.toLowerCase())) {
                    return {
                        appId: intent.appId,
                        intentName: intent.intentName,
                        parameters: { rawText: text } 
                    };
                }
            }
        }
        
        // 2. Fallback to System Intents
        if (lowerText.includes("open") || lowerText.includes("launch")) {
            const appsList = Object.keys(window.apps || {});
            for (const appName of appsList) {
                if (lowerText.includes(appName.toLowerCase())) {
                    return { systemAction: 'openApp', payload: appName };
                }
            }
        }

        if (lowerText.includes("sleep") || lowerText.includes("blackout")) {
            return { systemAction: 'sleep' };
        }

        return null; // Unrecognized
    }
}