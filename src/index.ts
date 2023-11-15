import '#lib/setup';
import { LogLevel, SapphireClient, container } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { GatewayIntentBits } from 'discord.js';
import { PrismaClient } from '@prisma/client';

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
		GatewayIntentBits.Guilds
	],
	hmr: {
		enabled: envParseString('NODE_ENV') !== 'production'
	},
	loadMessageCommandListeners: true
});

const main = async () => {
	container.prisma = new PrismaClient();

	try {
		client.logger.info('Logging in');
		await client.login(envParseString('DISCORD_TOKEN'));
		await container.prisma.$connect();
		client.logger.info('logged in');
	} catch (error) {
		client.logger.fatal(error);
		await client.destroy();
		process.exit(1);
	}
};

await main();
