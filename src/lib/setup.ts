// Unless explicitly defined, set NODE_ENV as development:
process.env.NODE_ENV ??= 'development';

import { ApplicationCommandRegistries, RegisterBehavior } from '@sapphire/framework';
import { setup, type ArrayString } from '@skyra/env-utilities';
import * as colorette from 'colorette';
import { srcDir } from '#lib/constants';
import '@sapphire/plugin-utilities-store/register';
import '@sapphire/plugin-logger/register';
import '@sapphire/plugin-hmr/register';
import type { PrismaClient } from '@prisma/client';
import { User } from 'discord.js';

// Set default behavior to bulk overwrite
ApplicationCommandRegistries.setDefaultBehaviorWhenNotIdentical(RegisterBehavior.BulkOverwrite);

// Read env var
setup(new URL('.env.local', srcDir));

// Enable colorette
colorette.createColors({ useColor: true });

declare module '@skyra/env-utilities' {
	interface Env {
		DISCORD_TOKEN: string;
		GUILD_ID: string;
		GUILD_MOD_ROLE: string;
		MODLOG_CHANNEL_ID: string;
		MODLOG_MESSAGES_THREAD_ID: string;
		MODLOG_MEMBERS_THREAD_ID: string;
		MODLOG_ROLES_THREAD_ID: string;
		MODLOG_CHANNELS_THREAD_ID: string;
		IGNORED_USER_IDS: ArrayString;
		TICKET_CATEGORY_ID: string;
		TICKET_TRANSCRIPT_CHANNEL_ID: string;
		SUGGESTION_CHANNEL_ID: string;
		WELCOMING_CHANNEL_ID: string;
		WELCOMING_ROLE_ID: string;
		// Honestly, I should probably move this to the
		// DB or something and just apply them with a command
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		prisma: PrismaClient;
		tracker: any;
		logsCache: Map<string, User>;
	}
}
