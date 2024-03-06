import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { inlineCodeBlock } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { MessageType, type Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.MessageCreate
})
export class MessageCreateListener extends Listener {
	public async run(message: Message) {
		if (!message.guild) return;
		if (message.author.bot || message.author.id === this.container.client.user?.id || message.author.system) return;

		if (message.type !== MessageType.UserJoin) return;

		try {
			const threadChannel = await message.guild.channels.fetch(envParseString('WELCOMING_CHANNEL_ID'));
			if (!threadChannel?.isTextBased()) return;

			return threadChannel.send({
				content: `<@&${envParseString('WELCOMING_ROLE_ID')}> ${inlineCodeBlock(message.author.displayName)} has joined the server! Say hello`
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
