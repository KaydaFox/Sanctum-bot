import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { EmbedBuilder, GuildMember } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	name: 'warnings',
	description: 'Manage warnings for a user',
	subcommands: [
		{
			name: 'remove',
			chatInputRun: 'removeWarning'
		},
		{
			name: 'clear',
			chatInputRun: 'clearWarnings'
		}
	]
})
export class WarningsSubcommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) => {
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addSubcommand((subcommamd) =>
					subcommamd
						.setName('remove')
						.setDescription('Remove a warning from the user')
						.addIntegerOption((option) =>
							option
								.setName('warning_id')
								.setDescription('The ID of the warning you want to remove')
								.setAutocomplete(true)
								.setRequired(true)
						)
				)
				.addSubcommand((subcommamd) =>
					subcommamd
						.setName('clear')
						.setDescription('Clear all warnings from the user')
						.addUserOption((option) => option.setName('user').setDescription('The user to clear warnings for').setRequired(true))
				);
		});
	}

	public override async autocompleteRun(interaction: Subcommand.AutocompleteInteraction) {
		const idToMatch = interaction.options.getInteger('warning_id');

		const guildWarnings = await this.container.prisma.warning.findMany({
			where: isNullishOrEmpty(idToMatch) ? {} : { id: parseInt(idToMatch.toString(), 10) },
			// for- whatever reason, it doesnt want to accept idToMatch directly and claims it's a string
			// so take this whacky workaround
			orderBy: { id: 'desc' },
			take: 25
		});

		if (!guildWarnings) return interaction.respond([{ value: 0, name: 'There are no warnings to display' }]);

		return interaction.respond(
			guildWarnings.map((warning) => ({
				value: warning.id,
				name: `${warning.id} - ${warning.reason.substring(0, 50)}`
			}))
		);
	}

	public async removeWarning(interaction: Subcommand.ChatInputCommandInteraction) {
		const warningId = interaction.options.getInteger('warning_id');
		if (!warningId) return interaction.reply('Please provide a valid warning ID to remove');

		try {
			const warning = await this.container.prisma.warning.delete({ where: { id: warningId } });

			const didSendDm = await this.container.utilities.modlogUtilities.sendDmToUser(
				String(warning.userId),
				new EmbedBuilder()
					.setAuthor({
						name: interaction.guild?.name ?? 'Kent Socialising for over 18s',
						iconURL: interaction.guild?.iconURL() ?? undefined
					})
					.setDescription(`Your warning has been removed`)
					.addFields({
						name: 'Warning data',
						value: warning.reason ?? 'No reason provided'
					})
			);

			this.container.client.emit('guildWarnRemove', interaction.user, String(warning.userId), {
				id: warningId,
				reason: warning.reason,
				didSendDm
			});

			return interaction.reply(`Warning ${warningId}, assigned to <@${warning.userId}> by <@${warning.moderatorId}> has been removed`);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.reply('An error occured while trying to remove the warning');
		}
	}

	public async clearWarnings(interaction: Subcommand.ChatInputCommandInteraction) {
		const member = (await interaction.options.getMember('user')) as GuildMember;
		if (!member) return interaction.reply('Please provide a valid user to clear warnings for');

		try {
			await this.container.prisma.warning.deleteMany({ where: { userId: BigInt(member.id) } });

			const didSendDm = await this.container.utilities.modlogUtilities.sendDmToUser(
				member.id,
				new EmbedBuilder()
					.setAuthor({
						name: interaction.guild?.name ?? 'Kent Socialising for over 18s',
						iconURL: interaction.guild?.iconURL() ?? undefined
					})
					.setDescription(`All of your warnings have been removed`)
			);

			const threadChannel = await this.container.client.utilities.modlogUtilities.fetchThreadChannel('MEMBERS');

			await threadChannel.send({
				embeds: [
					new EmbedBuilder()
						.setAuthor({
							name: member.user.username,
							iconURL: member.user.displayAvatarURL()
						})
						.setTitle(`Warnings cleared by ${interaction.user.username}`)
						.addFields({
							name: 'DM status',
							value: didSendDm ? 'Sent' : 'Unable to send'
						})
				]
			});

			return interaction.reply(`All warnings for <@${member.id}> have been cleared`);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.reply('An error occured while trying to remove the warning');
		}
	}
}
