import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ModalSubmitInteraction, PermissionFlagsBits } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.ModalSubmit
})
export default class SuggestionsModalHandler extends InteractionHandler {
	public override parse(interaction: ModalSubmitInteraction) {
		const interactionData = interaction.customId.split('.');
		/**
		 * Forattming for modal customId
		 * suggestionModal[0].<type>[1].<id>[2]
		 * type can be one of three things: `
		 */

		if (interactionData[0] !== 'suggestionModal') return this.none();

		return this.some({ type: interactionData[1], id: interactionData[2] });
	}

	public async run(interaction: ModalSubmitInteraction, data: { type: string; id: string }) {
		const { suggestionUtilities } = this.container.utilities;

		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers)) return interaction.reply('Sorry, you cannot use this button');
		await interaction.deferReply({ ephemeral: true });

		return suggestionUtilities.markSuggestion(Number(data.id), data.type, interaction);
	}
}
