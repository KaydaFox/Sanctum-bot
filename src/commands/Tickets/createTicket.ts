import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { envParseString } from '@skyra/env-utilities';
import { ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField } from 'discord.js';

@ApplyOptions<Command.Options>({
	name: 'create_ticket',
	description: 'Create a ticket'
})
export default class CreateTicketSubcommand extends Command {
	public override registerApplicationCommands(registry: Command.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription(this.description)
				.setDMPermission(false)
				.addStringOption((option) => option.setName('reason').setDescription('The reason for opening this ticket').setRequired(true))
		);
	}

	public async chatInputRun(interaction: Command.ChatInputCommandInteraction<'cached'>) {
		await interaction.deferReply({ ephemeral: true });

		try {
			const reason = interaction.options.getString('reason', true);

			const ticketCount = await this.container.prisma.ticket.count();
			const ticketId = ticketCount + 1;

			const ticketChannel = await interaction.guild.channels.create({
				name: `ticket-${ticketId}`,
				parent: envParseString('TICKET_CATEGORY_ID'),
				permissionOverwrites: [
					{
						id: interaction.guild.id,
						deny: [PermissionsBitField.Flags.ViewChannel]
					},
					{
						id: interaction.user.id,
						allow: [PermissionsBitField.Flags.ViewChannel]
					},
					{
						id: envParseString('GUILD_MOD_ROLE'),
						allow: [PermissionsBitField.Flags.ViewChannel]
					}
				]
			});

			await Promise.all([
				this.container.prisma.ticket.create({
					data: {
						opener: BigInt(interaction.user.id),
						channelId: BigInt(ticketChannel.id),
						reason
					}
				}),

				ticketChannel.send({
					content: `## New ticket\n**Opened by:** ${interaction.user}\n**Reason:** ${reason}`,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder().setCustomId(`ticket.close.${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger)
						)
					]
				})
			]);

			return interaction.editReply(`Ticket created successfully, it can be found at <#${ticketChannel.id}>`);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply(`I'm sorry, an error occurred whilst creating a ticket. Please try again or inform a staff member`);
		}
	}
}
