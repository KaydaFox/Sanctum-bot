import type { Warning } from '@prisma/client';
import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { EmbedBuilder, PermissionFlagsBits, User } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'view_warnings',
	description: 'View warnings for you or another user'
})
export class ViewWarningsCommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder //
				.setName(this.name)
				.setDescription(this.description)
				.addUserOption((option) =>
					option //
						.setName('user')
						.setDescription('The user to view warnings for')
						.setRequired(false)
				)
		);
	}

	public override async chatInputRun(interaction: Command.ChatInputCommandInteraction) {
		// doing this like so to allow users to also the command in DMs
		const requestedUser = interaction.options.getUser('user');
		try {
			if (!requestedUser || requestedUser.id === interaction.user.id) {
				// no point checking here if the user is in the server
				// since they wouldnt be able to use the bot if they weren't
				const warnings = await this.fetchWarnings(BigInt(interaction.user.id));
				return this.sendWarnings(interaction.user, warnings, interaction);
			}

			const guild = this.container.client.guilds.cache.get(envParseString('GUILD_ID'));
			if (!guild || !guild.available) return interaction.reply({ content: 'An error occurred while fetching warnings', ephemeral: true });
			// if I can't obtain the guild or it's unavailable, I can't check permissions
			// needed because I only want moderators to be able to fetch warnings for other users

			const interactionMember = await guild.members.fetch(interaction.user.id);
			if (!interactionMember.permissions.has(PermissionFlagsBits.ModerateMembers)) {
				const warnings = await this.fetchWarnings(BigInt(interaction.user.id));
				return this.sendWarnings(interaction.user, warnings, interaction);
			}

			const requestedMember = await guild.members.fetch(requestedUser.id);
			if (!requestedMember) return interaction.reply({ content: 'Please provide a valid user', ephemeral: true });
			// if there is no member returned, then we just want to return an error

			const warnings = await this.fetchWarnings(BigInt(requestedUser.id));
			return this.sendWarnings(requestedUser, warnings, interaction, true);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.reply({ content: 'An error occurred while fetching warnings', ephemeral: true });
		}
	}

	private async fetchWarnings(userId: bigint) {
		return this.container.prisma.warning.findMany({
			where: {
				userId
			},
			take: 25
		});
	}

	private sendWarnings(user: User, warnings: Warning[], interaction: Command.ChatInputCommandInteraction, userIsModerator: boolean = false) {
		const warningsEmbed = new EmbedBuilder()
			.setAuthor({
				name: user.username,
				iconURL: user.displayAvatarURL()
			})
			.setTitle('User Warnings');

		warnings.length < 1
			? warningsEmbed.setDescription('No warnings found')
			: warningsEmbed.addFields(
					warnings.map((warning, index) => ({
						name: `Warning #${index}`,
						value: `**Reason:** \n${warning.reason}\n\n**Moderator:** <@${warning.moderatorId}> ${
							userIsModerator ? `\n**Warning ID:** ${warning.id}` : ''
						}`
					}))
			  );

		return interaction.reply({
			embeds: [warningsEmbed]
		});
	}
}
