import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { EmbedBuilder, type ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		const interactionData = interaction.customId.split('.');
		// warn[0].reason[1].<userId>[2]
		if (interactionData[0] !== 'warn') return this.none();

		return this.some(interactionData[2]);
	}

	public async run(interaction: ModalSubmitInteraction, userId: string) {
		await interaction.deferReply({ ephemeral: true });
		try {
			const reason = interaction.fields.getTextInputValue('warn.reasonInput');

			await this.container.prisma.warning.create({
				data: {
					reason,
					moderatorId: BigInt(interaction.user.id),
					userId: BigInt(userId)
				}
			});

			const didSendDm = await this.container.client.utilities.modlogUtilities.sendDmToUser(
				userId,
				new EmbedBuilder()
					.setAuthor({
						name: interaction.guild?.name || 'Kent socialising',
						iconURL: interaction.guild?.iconURL() || undefined
					})
					.setDescription('You received a warning')
					.addFields({
						name: 'Reason',
						value: reason ?? 'No reason provided'
					})
			);

			this.container.client.emit('guildWarnAdd', interaction.user, userId, { reason, didSendDm });

			return interaction.editReply({
				content: `Successfully warned <@${userId}>`
			});
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply({ content: 'An error occurred while warning the user' });
		}
	}
}
