import { ApplyOptions } from '@sapphire/decorators';
import { Utility } from '@sapphire/plugin-utilities-store';
import { toTitleCase } from '@sapphire/utilities';
import { envParseString } from '@skyra/env-utilities';
import { ChatInputCommandInteraction, EmbedBuilder, GuildTextBasedChannel, ModalSubmitInteraction } from 'discord.js';

@ApplyOptions<Utility.Options>({
	name: 'suggestionUtilities'
})
export class SuggestionUtilities extends Utility {
	/**
	 * Whilst this doesnt need to really exist for now
	 * but just incase we want to expand on this with subcommands in the future
	 * we can keep all of the logic in the same place and just utilise it
	 */
	public async markSuggestion(suggestionId: number, type: string, interaction: ChatInputCommandInteraction | ModalSubmitInteraction) {
		const reason =
			interaction instanceof ModalSubmitInteraction
				? interaction.fields.getTextInputValue('suggestionModal.reason')
				: interaction.options.getString('reason', true);

		try {
			const suggestion = await this.container.prisma.suggestion.findFirst({
				where: {
					id: suggestionId
				}
			});
			if (!suggestion) throw Error('Failed to find the data for that suggestion in my database');

			if (suggestion.status === type) throw Error('That suggestion has already been marked as that type');

			const suggestionChannel = await this.getSuggestionChannel();
			if (!suggestionChannel) throw Error('Failed to find the suggestion channel');

			const suggestionMessage = await suggestionChannel.messages.fetch(String(suggestion.messageId));

			const suggestionEmbed = EmbedBuilder.from(suggestionMessage.embeds[0]);

			const formattedType = type === 'deny' ? 'Deni' : toTitleCase(type);

			suggestionEmbed.addFields({
				name: `${formattedType}ed by ${interaction.user.username} at <t:${Math.floor(Date.now() / 1000)}:F>`,
				value: reason ?? 'No reason provided'
			});

			suggestionEmbed.setColor(suggestionColour[type as keyof typeof suggestionColour]);

			await Promise.all([
				suggestionMessage.edit({
					embeds: [suggestionEmbed]
				}),

				this.container.utilities.modlogUtilities.sendDmToUser(
					suggestion.opener.toString(),
					new EmbedBuilder().setTitle(`Suggestion ${suggestion.id} ${formattedType}ed`).addFields(
						{
							name: 'Suggestion',
							value: suggestion.suggestion
						},
						{
							name: 'Reason',
							value: reason ?? 'No reason provided'
						}
					)
				)
			]);

			return interaction.editReply({ content: 'Suggestion updated successfully' });
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply({ content: `Failed to update suggestion\n${error}` });
		}
	}

	public async getSuggestionChannel() {
		return this.container.client.channels.fetch(envParseString(`SUGGESTION_CHANNEL_ID`)) as Promise<GuildTextBasedChannel | null>;
	}
}

declare module '@sapphire/plugin-utilities-store' {
	export interface Utilities {
		suggestionUtilities: SuggestionUtilities;
	}
}

enum suggestionColour {
	accept = '#00FF00',
	deny = '#FF0000',
	consider = '#FFFF00'
}
