import { ApplyOptions } from '@sapphire/decorators';
import { Duration } from '@sapphire/duration';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { EmbedBuilder, type ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		const interactionData = interaction.customId.split('.');
		// ban[0].modal[1].<userId>[2]
		if (interactionData[0] !== 'ban') return this.none();

		return this.some(interactionData[2]);
	}

	public async run(interaction: ModalSubmitInteraction, userId: string) {
		await interaction.deferReply({ ephemeral: true });
		try {
			const reason = interaction.fields.getTextInputValue('ban.reasonInput');
			const timeLength = new Duration(interaction.fields.getTextInputValue('ban.lengthInput')).fromNow;

			const emebedToSendToUser = new EmbedBuilder()
				.setAuthor({
					name: interaction.guild?.name || 'Kent socialising',
					iconURL: interaction.guild?.iconURL() || undefined
				})
				.setDescription('You were banned from the server')
				.addFields({
					name: 'Reason',
					value: reason ?? 'No reason provided'
				});

			if (timeLength) {
				await this.container.prisma.ban.create({
					data: {
						userId: BigInt(userId),
						expiresAt: timeLength
					}
				});

				emebedToSendToUser.addFields({
					name: 'Expires',
					value: Date.parse(timeLength.toString()).toString()
				});
			}

			const didSendDm = await this.container.client.utilities.modlogUtilities.sendDmToUser(userId, emebedToSendToUser);

			await this.container.client.guilds.cache
				.get(envParseString('GUILD_ID'))
				?.members.ban(userId, { reason: `${reason} - Banned by (${interaction.user.username})` ?? 'No reason provided' });

			return interaction.editReply({
				content: `Successfully banned <@${userId}>. ${didSendDm ? 'They were also sent a DM' : 'I could not send them a DM'}`
			});
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply({ content: 'An error occurred while banning the user, please ban them yourself' });
		}
	}
}
