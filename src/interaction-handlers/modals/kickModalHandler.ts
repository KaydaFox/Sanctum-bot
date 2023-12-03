import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { EmbedBuilder, type ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export class ModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		const interactionData = interaction.customId.split('.');
		// kick[0].modal[1].<userId>[2]
		if (interactionData[0] !== 'kick') return this.none();

		return this.some(interactionData[2]);
	}

	public async run(interaction: ModalSubmitInteraction, userId: string) {
		await interaction.deferReply({ ephemeral: true });
		try {
			const reason = interaction.fields.getTextInputValue('kick.reasonInput');

			const didSendDm = await this.container.client.utilities.modlogUtilities.sendDmToUser(
				userId,
				new EmbedBuilder()
					.setAuthor({
						name: interaction.guild?.name || 'Kent socialising',
						iconURL: interaction.guild?.iconURL() || undefined
					})
					.setDescription('You were kicked from the server')
					.addFields({
						name: 'Reason',
						value: reason ?? 'No reason provided'
					})
			);

			await this.container.client.guilds.cache.get(envParseString('GUILD_ID'))?.members.kick(userId, reason ?? undefined);

			return interaction.editReply({
				content: `Successfully kicked <@${userId}>. ${didSendDm ? 'They were also sent a DM' : 'I could not send them a DM'}`
			});
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply({ content: 'An error occurred while kicking the user, please kick them yourself' });
		}
	}
}
