import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'suggest',
	description: 'Suggest something for the server'
})
export default class SuggestCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) => option.setName('suggestion').setDescription('Please input your suggestion').setRequired(true))
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction<'cached'>) {
		try {
			const suggestionText = interaction.options.getString('suggestion', true);

			if (!suggestionText) throw Error('No suggestion provided');
			// This should *never* happen but justttt in case it does

			const suggestionChannel = await this.container.utilities.suggestionUtilities.getSuggestionChannel();

			if (!suggestionChannel) throw Error('Suggestion channel was not found');

			await interaction.deferReply({ ephemeral: true });

			const currentSuggestionCount = await this.container.prisma.suggestion.count();

			const suggestionId = currentSuggestionCount + 1;

			const suggestionEmbed = new EmbedBuilder()
				.setAuthor({
					name: interaction.user.username,
					iconURL: interaction.user.displayAvatarURL()
				})
				.setTitle(`Suggestion ${suggestionId}`)
				.setDescription(suggestionText);

			const suggestionMessage = await suggestionChannel.send({ embeds: [suggestionEmbed], components: [this.createComponents(suggestionId)] });

			await Promise.all([
				suggestionMessage.react('✅').catch(() => {
					/* empty */
				}),
				suggestionMessage.react('❌').catch(() => {
					/* empty */
				}),
				this.container.prisma.suggestion.create({
					data: {
						id: suggestionId,
						opener: BigInt(interaction.user.id),
						suggestion: suggestionText,
						status: 'pending',
						messageId: BigInt(suggestionMessage.id)
					}
				})
			]);

			const thread = await suggestionMessage.startThread({
				name: `Suggestion ${suggestionId}`,
				reason: 'Suggestion thread'
			});

			await thread.members.add(interaction.user.id);

			return interaction.editReply({ content: `Your suggestion was created successfully, you can find it at ${suggestionMessage.url}` });
		} catch (error) {
			this.container.logger.error(error);
			// return interaction.reply({ content: `Failed to create your suggestion\n${error}`, ephemeral: true });
			const interactionPayload = { content: `Failed to create your suggestion\n${error}`, ephemeral: true };
			return interaction.deferred ? interaction.editReply(interactionPayload) : interaction.reply(interactionPayload);
		}
	}

	private createComponents(suggestionId: number): ActionRowBuilder<ButtonBuilder> {
		const acceptButton = new ButtonBuilder().setCustomId(`suggestion.accept.${suggestionId}`).setLabel('Accept').setStyle(ButtonStyle.Success);

		const considerButton = new ButtonBuilder()
			.setCustomId(`suggestion.consider.${suggestionId}`)
			.setLabel('Consider')
			.setStyle(ButtonStyle.Secondary);

		const denyButton = new ButtonBuilder().setCustomId(`suggestion.deny.${suggestionId}`).setLabel('Deny').setStyle(ButtonStyle.Danger);

		return new ActionRowBuilder<ButtonBuilder>().addComponents(acceptButton, considerButton, denyButton);
	}
}
