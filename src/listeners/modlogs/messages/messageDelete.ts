import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import { codeBlock, sleep } from '@sapphire/utilities';
import { AuditLogEvent, EmbedBuilder, type Message } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.MessageDelete
})
export class MessageDeleteListener extends Listener {
	public async run(message: Message) {
		if (!message.guild) return;
		if (message.author.bot || message.author.id === this.container.client.user?.id || message.author.system) return;

		try {
			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MESSAGES');

			let memberWhoDeleted = message.author;

			await sleep(5000);
			// this 5 second sleep is to allow the audit logs to update.
			// It's easier to do it this way lol

			const auditLogEntry = await message.guild.fetchAuditLogs({
				type: AuditLogEvent.MessageDelete,
				limit: 1
			});

			if (auditLogEntry.entries.first()?.targetId === message.author.id)
				memberWhoDeleted =
					auditLogEntry.entries.first()?.executor ??
					(await this.container.client.users.fetch(auditLogEntry.entries.first()?.executorId as string));
			// this is really not the way i wanted to do this, but discord is being really annoying with it so uh- yeah

			const deletedMessageEmbed = new EmbedBuilder()
				.setAuthor({
					name: message.author.username,
					iconURL: message.author.displayAvatarURL()
				})
				.setTitle(`Message Deleted from <#${message.channel.id}>`)
				.setDescription(
					codeBlock(message.cleanContent || 'This message had no content to display, maybe it was a join message or only had an attachment')
				)
				.setFooter({
					text: `Deleted by: ${memberWhoDeleted.username}`,
					iconURL: memberWhoDeleted.displayAvatarURL()
				});

			if (message.attachments.size > 0) {
				let attachmentInfo = '';
				message.attachments.forEach((attachment) => {
					attachmentInfo += `Filename: ${attachment.name}, Type: ${attachment.contentType}\n`;
				});
				deletedMessageEmbed.addFields({
					name: `${message.attachments.size} attachment${message.attachments.size > 1 ? 's' : ''}`,
					value: attachmentInfo
				});
			}

			return threadChannel.send({ embeds: [deletedMessageEmbed] });
		} catch (error) {
			return this.container.logger.error(error);
		}
	}
}
