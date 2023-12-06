import { ApplyOptions } from '@sapphire/decorators';
import { InteractionHandler, InteractionHandlerTypes } from '@sapphire/framework';
import { ActionRowBuilder, ButtonInteraction, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';

@ApplyOptions<InteractionHandler.Options>({
	interactionHandlerType: InteractionHandlerTypes.Button
})
export default class TicketButtonHandlers extends InteractionHandler {
	public override parse(interaction: ButtonInteraction) {
		const interactionData = interaction.customId.split('.');
		/** Formatting for button customId
		 * ticket[0].<'close' (button type)>[1].<number (ticket id)>[2]
		 * I've written it like this so that we can expand on this easily in the future
		 */

		if (interactionData[0] !== 'ticket') return this.none();

		return this.some({ buttonType: interactionData[1], ticketId: Number(interactionData[2]) });
	}

	public override async run(interaction: ButtonInteraction<'cached'>, data: { buttonType: string; ticketId: number }) {
		if (data.buttonType === 'close') return this.closeTicket(interaction, data.ticketId);

		return interaction.reply("Somehow, you've caused an error that should NOT happen, please inform an admin");
	}

	private async closeTicket(interaction: ButtonInteraction<'cached'>, ticketId: number) {
		const reasonTextInput = new TextInputBuilder()
			.setLabel('Reason')
			.setCustomId('ticketCloseModal.reasonInput')
			.setPlaceholder('Please provide a reason')
			.setMinLength(1)
			.setMaxLength(512)
			.setStyle(TextInputStyle.Paragraph);
		const textInputRow = new ActionRowBuilder<TextInputBuilder>().addComponents(reasonTextInput);
		const reasonModal = new ModalBuilder()
			.setTitle(`Close ticket ${ticketId}`)
			.addComponents(textInputRow)
			.setCustomId(`ticketCloseModal.${ticketId}`);

		return interaction.showModal(reasonModal);
	}
}
