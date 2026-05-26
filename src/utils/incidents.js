const incidents = [];
const MAX_INCIDENTS = 10;
const config = require("../../config");

const UNIMPORTANT_PATTERNS = [
    "unexpected server response",
    "timeout",
    "socket hang up",
    "ECONNRESET",
];

function isImportantIncident(description) {
    const lowerDesc = description.toLowerCase();
    return !UNIMPORTANT_PATTERNS.some(pattern => lowerDesc.includes(pattern.toLowerCase()));
}

function anonymizeNodeNames(description) {
    let result = description;
    for (let i = 0; i < config.nodes.length; i++) {
        const nodeName = config.nodes[i].name;
        const displayName = i === 0 ? "Main Node" : `Node ${i}`;
        result = result.split(nodeName).join(displayName);
    }
    return result;
}

function recordIncident(component, description) {
    if (!isImportantIncident(description)) {
        return;
    }

    const anonymizedDesc = anonymizeNodeNames(description);

    const now = Date.now();
    const FIVE_MINUTES = 5 * 60 * 1000;
    const isDuplicate = incidents.some(i =>
        i.component === component &&
        i.description === anonymizedDesc &&
        (now - i.timestamp) < FIVE_MINUTES
    );

    if (isDuplicate) {
        return;
    }

    const incident = {
        timestamp: now,
        component,
        description: anonymizedDesc,
    };

    incidents.unshift(incident);

    if (incidents.length > MAX_INCIDENTS) {
        incidents.pop();
    }
}

function getIncidents() {
    return [...incidents];
}

function getIncidentsForComponent(component) {
    return incidents.filter(i => i.component === component);
}

function formatIncidents(limit = 4) {
    if (incidents.length === 0) {
        return "-# No incidents reported this session.";
    }
    
    return incidents
        .slice(0, limit)
        .map(i => `-# <t:${Math.floor(i.timestamp / 1000)}:t> · ${i.component}: ${i.description}`)
        .join("\n");
}

module.exports = {
    recordIncident,
    getIncidents,
    getIncidentsForComponent,
    formatIncidents,
};
