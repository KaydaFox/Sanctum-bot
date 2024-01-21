import '#lib/setup';
import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { GatewayIntentBits, User } from 'discord.js';
import { PrismaClient } from '@prisma/client';
import { init } from '@androz2091/discord-invites-tracker';

const client = new SapphireClient({
	defaultPrefix: '>.',
	caseInsensitiveCommands: true,
	logger: {
		level: LogLevel.Debug
	},
	intents: [
		GatewayIntentBits.GuildModeration,
		GatewayIntentBits.DirectMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildInvites,
		GatewayIntentBits.Guilds
	],
	hmr: {
		enabled: envParseString('NODE_ENV') !== 'production'
	},
	loadMessageCommandListeners: true
});

const main = async () => {
	container.prisma = new PrismaClient();
	container.logsCache = new Map<string, User>();

	try {
		client.logger.info('Logging in');
		await client.login(envParseString('DISCORD_TOKEN'));
		await container.prisma.$connect();
		client.logger.info('logged in');

		container.tracker = init(client, {
			fetchAuditLogs: true,
			fetchGuilds: true,
			fetchVanity: true
		});

		container.tracker.on('guildMemberAdd', (member: any, inviteType: any, invite: any) => {
			container.client.emit('guildMemberAddWithInvite', member, inviteType, invite);
		});
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

await main();
