const express = require('express');
const path = require('path');
const db = require('../utils/db');
const { getConfig } = require('../utils/configManager');

module.exports = (client) => {
    const app = express();
    const PORT = process.env.PORT || process.env.DASHBOARD_PORT || 3000;

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));
    app.use(express.static(path.join(__dirname, 'public')));
    app.use(express.urlencoded({ extended: true }));
    app.use(express.json());

    // Middleware to pass client and dbStatus to views
    app.use((req, res, next) => {
        res.locals.client = client;
        res.locals.dbStatus = true; // NeDB is always "online" as it's a file
        next();
    });

    // Home Page - List Servers
    app.get('/', (req, res) => {
        const guilds = client.guilds.cache.map(g => ({
            id: g.id,
            name: g.name,
            icon: g.iconURL({ dynamic: true }) || 'https://cdn.discordapp.com/embed/avatars/0.png',
            memberCount: g.memberCount,
            activeCount: g.presences ? g.presences.cache.filter(p => p.status !== 'offline').size : 0,
            offlineCount: g.memberCount - (g.presences ? g.presences.cache.filter(p => p.status !== 'offline').size : 0)
        }));
        const inviteLink = `https://discord.com/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        res.render('index', { guilds, inviteLink });
    });

    // Settings Page
    app.get('/settings/:guildId', async (req, res) => {
        const guild = client.guilds.cache.get(req.params.guildId);
        if (!guild) return res.redirect('/');

        const config = await getConfig(guild.id);
        
        // Fetch Channels and Roles for the dropdowns
        const channels = guild.channels.cache
            .filter(c => c.type === 0 || c.type === 5) // Text and Announcement channels
            .map(c => ({ id: c.id, name: c.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const roles = guild.roles.cache
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name }))
            .sort((a, b) => a.name.localeCompare(b.name));

        const success = req.query.success === 'true';
        const error = req.query.error === 'true';

        res.render('settings', { guild, config, channels, roles, success, error });
    });

    // Save Settings
    app.post('/settings/:guildId', async (req, res) => {
        const { guildId } = req.params;
        try {
            const updateData = { ...req.body };
            
            // Handle arrays (Comma separated IDs)
            const arrayFields = [
                'MOD_ROLE_IDS', 'ALLOWED_LOA_ROLE', 'ALLOWED_APPROVE_ROLES', 
                'ALLOWED_GANGFUND_ROLE', 'ALLOWED_INTERACTION_ROLE', 
                'ALLOWED_END_LOA_ROLE', 'DISCHARGED_ROLE_ID'
            ];
            
            arrayFields.forEach(field => {
                if (updateData[field]) {
                    if (Array.isArray(updateData[field])) {
                        updateData[field] = updateData[field].filter(Boolean);
                    } else if (typeof updateData[field] === 'string') {
                        updateData[field] = updateData[field].split(',').map(s => s.trim()).filter(Boolean);
                    }
                } else {
                    updateData[field] = []; // Ensure empty selections clear the array
                }
            });

            // NeDB update
            await db.update({ guildId }, { $set: updateData }, { upsert: true });
            res.redirect(`/settings/${guildId}?success=true`);
        } catch (err) {
            console.error(err);
            res.redirect(`/settings/${guildId}?error=true`);
        }
    });

    const server = app.listen(PORT, '0.0.0.0', () => {
        console.log(`🌐 Dashboard is live at http://localhost:${PORT}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`-----------------------------------------------------------------`);
            console.error(`❌ PORT ${PORT} IS ALREADY IN USE!`);
            console.error(`👉 The website dashboard could not start because another app is using port ${PORT}.`);
            console.error(`👉 You can configure a different port by adding DASHBOARD_PORT=3001 (or any other number) to your .env file.`);
            console.error(`-----------------------------------------------------------------`);
        } else {
            console.error(`❌ Dashboard failed to start:`, err.message);
        }
    });
};
