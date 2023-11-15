import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { codeBlock } from '@sapphire/utilities';
import { envParseArray } from '@skyra/env-utilities';
import { EmbedBuilder, type Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.MessageUpdate
})
export class MessageUpdateListener extends Listener {
	public async run(oldMessage: Message, newMessage: Message) {
		if (newMessage.author.bot || newMessage.author.id === this.container.client.user?.id || newMessage.author.system) return;

		// check to see if an embed was added to user message, since for some reason it fires this event for that lmaoo
		if (oldMessage.content === newMessage.content) return;
		if (!oldMessage.embeds && newMessage.embeds.length > 0) return;

		// ignore certain ppl who like to flood logs *stares at psyber*
		if (envParseArray('IGNORED_USER_IDS').includes(newMessage.author.id)) return;

		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MESSAGES');

			const editedMessageEmbed = new EmbedBuilder()
				.setAuthor({
					name: newMessage.author.username,
					iconURL: newMessage.author.displayAvatarURL()
				})
				.setTitle(`Message edited from ${newMessage.url}`)
				.addFields(
					{
						name: 'Old Message',
						value: codeBlock(
							oldMessage.cleanContent || 'This message had no content to display, maybe it was a join message or only had an attachment'
						)
					},
					{
						name: 'New Message',
						value: codeBlock(
							newMessage.cleanContent || 'This message had no content to display, maybe it was a join message or only had an attachment'
						)
					}
				);

			return threadChannel.send({ embeds: [editedMessageEmbed] });
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
