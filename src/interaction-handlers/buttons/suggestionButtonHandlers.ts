import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { toTitleCase } from '@sapphire/utilities';
import { ActionRowBuilder, ButtonInteraction, ModalBuilder, PermissionFlagsBits, TextInputBuilder, TextInputStyle } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export default class SuggestionButtonHandlers extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		const interactionData = interaction.customId.split('.');
		/**
		 * Forattming for button customId
		 * suggestion[0].<type>[1].<id>[2]
		 * type can be one of three things: `
		 */

		if (interactionData[0] !== 'suggestion') return this.none();

		return this.some({ type: interactionData[1], id: interactionData[2] });
	}

	public async run(interaction: ButtonInteraction, data: { type: string; id: string }) {
		if (!interaction.memberPermissions?.has(PermissionFlagsBits.ModerateMembers))
			return interaction.reply({ content: `Sorry ${interaction.user}, you cannot use this button`, ephemeral: true });

		const reasonTextInput = new TextInputBuilder()
			.setCustomId('suggestionModal.reason')
			.setStyle(TextInputStyle.Paragraph)
			.setRequired(true)
			.setLabel('Reason');

		const modal = new ModalBuilder()
			.setTitle(`${toTitleCase(data.type)} suggestion`)
			.setCustomId(`suggestionModal.${data.type}.${data.id}`)
			.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(reasonTextInput));

		return interaction.showModal(modal);
	}
}
