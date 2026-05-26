const {
    SlashCommandBuilder,
    MessageFlags,
    ContainerBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const config = require("../../config");
const { formatIncidents } = require("../utils/incidents");
module.exports = {
    data: new SlashCommandBuilder()
        .setName("status")
        .setDescription("Check the current status of Musicify's systems"),

    async execute(interaction, client) {
        // Calculate system health
        const nodes = client.riffy.nodeMap;
        const nodeList = Array.isArray(nodes)
            ? nodes
            : nodes instanceof Map
                ? [...nodes.values()]
                : Object.values(nodes || {});

        const connectedNodes = nodeList.filter(node => node.connected || node.isConnected).length;
        const totalNodes = config.nodes.length;
        const botPing = client.ws?.ping ?? 0;

        let statusEmoji = "🟢";
        let statusText = "All systems operational";

        if (connectedNodes === 0 || botPing > 300) {
            statusEmoji = "🔴";
            statusText = "Major system issues detected";
        } else if (connectedNodes < totalNodes || botPing > 100) {
            statusEmoji = "🟡";
            statusText = "Some systems experiencing issues";
        }

        // Calculate uptime
        const uptimeSeconds = process.uptime();
        const uptimeHours = Math.floor(uptimeSeconds / 3600);
        const uptimeMinutes = Math.floor((uptimeSeconds % 3600) / 60);
        const startTime = new Date(Date.now() - uptimeSeconds * 1000);

        const container = new ContainerBuilder();

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(`## ${statusEmoji} ${statusText}`)
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Recent Incidents**\n` +
                formatIncidents(4)
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        const supportButton = new ButtonBuilder()
            .setLabel("Known Outages")
            .setURL("https://discord.gg/MRjEUhDCpZ")
            .setStyle(ButtonStyle.Link);

        const voteButton = new ButtonBuilder()
            .setLabel("⭐ Vote")
            .setURL("https://top.gg/bot/1502977716196999309?s=0b4dc71b855ce")
            .setStyle(ButtonStyle.Link);

        container.addActionRowComponents(new ActionRowBuilder().addComponents(supportButton, voteButton));

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(false));

        const startTimestamp = Math.floor(startTime.getTime() / 1000);

        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                `**Uptime**\n` +
                `-# 🕒 <t:${startTimestamp}:f> (<t:${startTimestamp}:R>)\n` +
                `-# *Times shown in your local timezone*`
            )
        );

        container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

        // Lavalink Node Stats
        container.addTextDisplayComponents(
            new TextDisplayBuilder().setContent(
                "### Lavalink Node Stats\n" +
                `-# ${connectedNodes}/${totalNodes} nodes available`
            )
        );

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId("node_stats_select")
            .setPlaceholder("📡 Select a node")
            .setMinValues(1)
            .setMaxValues(1);

        for (let i = 0; i < config.nodes.length; i++) {
            const configNode = config.nodes[i];
            const connectedNode = nodeList.find(n => n.name === configNode.name);
            const connected = connectedNode?.connected || connectedNode?.isConnected || false;
            const nodeStatusEmoji = connected ? "🟢" : "🔴";
            const displayName = i === 0 ? "Main Node" : `Node ${i}`;
            selectMenu.addOptions(
                new StringSelectMenuOptionBuilder()
                    .setLabel(displayName)
                    .setDescription(`${nodeStatusEmoji} ${connected ? "Connected" : "Disconnected"}`)
                    .setValue(`node_${i}`)
            );
        }

        const selectRow = new ActionRowBuilder().addComponents(selectMenu);
        container.addActionRowComponents(selectRow);

        return interaction.reply({
            components: [container],
            flags: MessageFlags.Ephemeral | MessageFlags.IsComponentsV2,
        });
    },
};

