// Polygol Assistant Natural Language Processor (kirbAI)
export class AssistantNLP {
    parseNumber(text) {
        if (!text) return null;
        const clean = text.toLowerCase().replace(/[^a-z0-9]/g, '');
        const map = {
            '1': 0, 'one': 0, 'won': 0, 'first': 0,
            '2': 1, 'two': 1, 'to': 1, 'too': 1, 'second': 1,
            '3': 2, 'three': 2, 'tree': 2, 'third': 2,
            '4': 3, 'four': 3, 'for': 3, 'fourth': 3,
            '5': 4, 'five': 4, 'fifth': 4
        };
        if (map[clean] !== undefined) return map[clean];

        const match = clean.match(/(?:number|option|item)(\d)/);
        if (match && map[match[1]] !== undefined) return map[match[1]];
        return null;
    }

    parse(text) {
        if (!text || typeof text !== 'string') return null;
        const lowerText = text.trim().toLowerCase();

        // 1. Check registered 3rd party Gurapp Intents
        const intents = (typeof window !== 'undefined' && window.ActivityIntents) || [];
        for (const intent of intents) {
            if (intent.keywords && Array.isArray(intent.keywords)) {
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
        }

        // 2. Weather
        if (/\b(weather|forecast|temperature|how('s| is) the weather|rain|sunny|how hot|how cold)\b/.test(lowerText)) {
            return { systemAction: 'weather' };
        }

        // 3. Sleep / Display Off
        if (/\b(sleep|blackout|turn off (display|screen)|lock screen|goodnight|screen off|turn off)\b/.test(lowerText)) {
            return { systemAction: 'sleep' };
        }

        // 4. Night Stand
        if (/\b(night stand|bedtime|night mode)\b/.test(lowerText)) {
            return { systemAction: 'nightStand' };
        }

        // 5. Eco Mode / Battery
        if (/\b(eco mode|battery saver|save battery|low power mode)\b/.test(lowerText)) {
            return { systemAction: 'ecoMode' };
        }

        // 6. Media Playback Controls
        if (/\b(pause|resume|next track|previous track|toggle music|stop music)\b/.test(lowerText)) {
            return { systemAction: 'mediaToggle', payload: 'Music' };
        }
        if (/\b(play music|play some music)\b/.test(lowerText)) {
            return { systemAction: 'openApp', payload: 'Music' };
        }

        // 7. Time & Date
        if (/\b(what time is it|current time|what's the time|tell me the time)\b/.test(lowerText)) {
            const timeStr = new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
            return { systemAction: 'info', responseText: `It's ${timeStr}.` };
        }
        if (/\b(what day is it|what('s| is) the date|today's date)\b/.test(lowerText)) {
            const dateStr = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
            return { systemAction: 'info', responseText: `Today is ${dateStr}.` };
        }

        // 8. Greetings & kirbAI Info
        if (/^(hi|hello|hey|hey kirbai|hello kirbai|greetings)\b/.test(lowerText)) {
            return { systemAction: 'info', responseText: "Hello! How can I help you today?" };
        }
        if (/\b(who are you|what can you do|what is kirbai|what is this)\b/.test(lowerText)) {
            return { systemAction: 'info', responseText: "I'm kirbAI, your ambient assistant. I can open apps, check the weather, control playback, or manage system settings." };
        }

        // 9. Open / Launch App
        const appsList = (typeof window !== 'undefined' && window.apps) ? Object.keys(window.apps) : [];
        const aliasMap = {
            'store': 'kirbStore',
            'app store': 'kirbStore',
            'appstore': 'kirbStore',
            'shop': 'kirbStore',
            'files': 'Files',
            'file manager': 'Files',
            'folder': 'Files',
            'explorer': 'Files',
            'browser': 'Internet',
            'internet': 'Internet',
            'web': 'Internet',
            'settings': 'Settings',
            'preferences': 'Settings',
            'control panel': 'Settings',
            'weather': 'Weather',
            'music': 'Music',
            'feedback': 'Feedback'
        };

        const openMatch = lowerText.match(/(?:open|launch|start|show|go to)\s+([a-z0-9\s_-]+)/i);
        const targetQuery = openMatch ? openMatch[1].trim() : lowerText;

        if (aliasMap[targetQuery]) {
            return { systemAction: 'openApp', payload: aliasMap[targetQuery] };
        }

        for (const appName of appsList) {
            if (targetQuery === appName.toLowerCase() || lowerText.includes(appName.toLowerCase())) {
                return { systemAction: 'openApp', payload: appName };
            }
        }

        for (const [alias, realName] of Object.entries(aliasMap)) {
            if (lowerText.includes(alias)) {
                return { systemAction: 'openApp', payload: realName };
            }
        }

        return null;
    }
}