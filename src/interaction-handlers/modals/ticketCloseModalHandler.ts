import { ApplyOptions } from '@sapphire/decorators';
import { Time } from '@sapphire/duration';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { EmbedBuilder, type ModalSubmitInteraction, type GuildTextBasedChannel, type Message, Collection, type Attachment } from 'discord.js';
import { createWriteStream, mkdirSync } from 'fs';
import { get } from 'https';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class TicketCloseModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction<'cached'>) {
		const interactionData = interaction.customId.split('.');
		// ticketCloseModal[0].<number (ticketId)>[1]
		if (interactionData[0] !== 'ticketCloseModal') return this.none();

		return this.some(Number(interactionData[1]));
	}

	public async run(interaction: ModalSubmitInteraction<'cached'>, ticketId: number) {
		await interaction.deferReply({ ephemeral: true });

		try {
			const ticketInfo = await this.container.prisma.ticket.findFirst({ where: { id: ticketId } });
			if (!ticketInfo) throw Error('Failed to get ticket info from database');

			if (interaction.user.id !== String(ticketInfo.opener) && !interaction.member.permissions.has('ModerateMembers'))
				return interaction.editReply('You cannot use this ticket!');

			const ticketChannel = <GuildTextBasedChannel | null>await interaction.guild.channels.fetch(String(ticketInfo.channelId));
			if (!ticketChannel) throw Error('Failed to get ticket channel from discord');

			const reason = interaction.fields.getTextInputValue('ticketCloseModal.reasonInput') ?? 'No reason provided';

			if (String(ticketInfo.opener) !== interaction.user.id)
				await this.container.utilities.modlogUtilities.sendDmToUser(
					String(ticketInfo.opener),
					new EmbedBuilder().setTitle('Ticket closed').setDescription(reason)
				);

			await Promise.all([
				ticketChannel.send(`This ticket was closed by ${interaction.user} with reason: \n${reason}`),

				interaction.editReply('Creating ticket transcript... This may take a while').catch(() => null)
			]);

			return this.generateAndSendTranscript(ticketChannel, ticketInfo);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply("I'm sorry, an error occured when processing this modal. Please let an admin know");
		}
	}

	private async generateAndSendTranscript(
		channel: GuildTextBasedChannel,
		ticketData: {
			id: number;
			reason: string;
			opener: bigint;
			channelId: bigint;
		}
	) {
		try {
			const transcriptChannel = <GuildTextBasedChannel | null>(
				await channel.guild.channels.fetch(envParseString('TICKET_TRANSCRIPT_CHANNEL_ID'))
			);
			if (!transcriptChannel) throw Error('Failed to fetch the transcript channel');

			const messages = await this.handleMessageCollection(channel);

			if (!messages) throw Error('Something in the message collection chain failed');

			return transcriptChannel?.send({
				content: `Transcript for ticket ${ticketData.id} with <@${ticketData.opener}>. Opened with reason: ${ticketData.reason}`,
				files: [{ attachment: Buffer.from(messages.join('\n\n----\n\n')), name: `ticket-${ticketData.id}-${ticketData.opener}.txt` }]
			});
		} catch (error) {
			return this.container.logger.error(error);
		}
	}

	private async handleMessageCollection(channel: GuildTextBasedChannel) {
		const collectionArray: Collection<string, Message<true | false>>[] = [];

		let lastId = channel.lastMessageId;

		while (true) {
			if (!lastId) break;

			const fetched = await channel.messages.fetch({
				limit: 100,
				before: lastId === channel.lastMessageId ? undefined : lastId
			});

			if (fetched.size === 0) break;

			collectionArray.push(fetched);

			lastId = fetched.last()?.id ?? null;

			if (fetched.size !== 100) {
				break;
			}
		}

		const messages = collectionArray[0].concat(...collectionArray.slice(1));

		const formattedMessages = await this.formatMessages(messages);

		await channel.delete();
		// this is deleted here because message formatting needs to fetch content from the channel
		// to format mentions and things and its still to do with the collection of messages

		return formattedMessages;
	}

	private formatMessages(messages: Collection<string, Message<true | false>>) {
		messages = messages.reverse();

		const groups: string[][] = [];

		let lastUserId = null;
		let lastMessageTime = 0;

		for (const message of messages.values()) {
			if (message.author.id === this.container.client.user?.id && message.content === '') continue;
			/** We return here since the only messages that would match this would be embed only matches from this bot
			 * Which for now we don't want to handle
			 * In the future, handling may be added but there's no plan right now
			 * Since extracting all the data from them is a pain and itd most likely only be from bots anyways.
			 */
			const cleanedMessage = message.cleanContent;

			let formattedMessage: string;

			if (message.author.id !== lastUserId || message.createdTimestamp - lastMessageTime > Time.Hour) {
				groups.push([]);

				lastUserId = message.author.id;
				lastMessageTime = message.createdTimestamp;

				formattedMessage = `${message.author.username} (${message.author.displayName}) - ${message.createdAt.toLocaleString('en-GB', {
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					second: '2-digit',
					hour12: false
				})}\n\n${cleanedMessage}`;
			} else {
				formattedMessage = `\n${cleanedMessage}`;
			}

			if (message.attachments.size > 0) {
				const attachmentDetails: string[] = [];

				mkdirSync(`./ticketAttachmentStorage/${message.id}`);
				for (const attachment of message.attachments.values()) {
					this.saveAttachment(attachment, message.id);

					attachmentDetails.push(`localhost:3000/${message.id}/${attachment.id}-${attachment.name}`);
				}

				formattedMessage += `\n\n[ATTACHMENTS]\n${attachmentDetails.join('\n')}`;
			}

			groups[groups.length - 1].push(formattedMessage);
		}

		return groups.map((group) => group.join(''));
	}

	private saveAttachment(attachment: Attachment, messageId: string) {
		const file = createWriteStream(`./ticketAttachmentStorage/${messageId}/${attachment.id}-${attachment.name}`);

		get(attachment.url, (response) => {
			response.pipe(file);

			file.on('finish', () => {
				file.close();
			});
		});
	}
}
