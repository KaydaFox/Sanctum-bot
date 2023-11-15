import { Utility } from '@sapphire/plugin-utilities-store';
import { envParseString } from '@skyra/env-utilities';
import type { EmbedBuilder, ThreadChannel } from 'discord.js';

export class ModlogUtilities extends Utility {
	public constructor(context: Utility.Context, options: Utility.Options) {
		super(context, {
			...options,
			name: 'modlogUtilities'
		});
	}

	public async fetchThreadChannel(type: 'MESSAGES' | 'MEMBERS' | 'ROLES' | 'CHANNELS') {
		const thread = await this.container.client.channels.fetch(envParseString(`MODLOG_${type}_THREAD_ID`));
		if (!thread) throw new Error('Unable to fetch channels thread');

		return thread as ThreadChannel;
	}

	public async sendDmToUser(userId: string, data: EmbedBuilder) {
		try {
			const user = await this.container.client.users.fetch(userId);

			await user.send({ embeds: [data] });

			return true;
		} catch (error) {
			return false;
		}
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		modlogUtilities: ModlogUtilities;
	}
}
