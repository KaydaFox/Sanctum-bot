import { ApplyOptions } from '@sapphire/decorators';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { envParseString } from '@skyra/env-utilities';
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	ModalBuilder,
	PermissionFlagsBits,
	PermissionsBitField,
	TextChannel,
	TextInputBuilder,
	TextInputStyle
} from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	name: 'manage_ticket',
	subcommands: [
		{
			name: 'create',
			chatInputRun: 'chatInputCreateTicket'
		},
		{
			name: 'close',
			chatInputRun: 'chatInputCloseTicket'
		},
		{
			name: 'user',
			type: 'group',
			entries: [
				{
					name: 'add',
					chatInputRun: 'chatInputUserAdd'
				},
				{
					name: 'remove',
					chatInputRun: 'chatInputUserRemove'
				}
			]
		}
	]
})
export default class ManageTicketSubcommand extends Subcommand {
	public override registerApplicationCommands(registry: Subcommand.Registry) {
		registry.registerChatInputCommand((builder) =>
			builder
				.setName(this.name)
				.setDescription('Manage tickets')
				.setDMPermission(false)
				.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('create')
						.setDescription('Create a ticket with a user')
						.addUserOption((option) => option.setName('user').setDescription('The user to create the ticket with').setRequired(true))
						.addStringOption((option) =>
							option.setName('reason').setDescription('The reason for opening this ticket (will be sent to the user)').setRequired(true)
						)
				)
				.addSubcommand((subcommand) =>
					subcommand
						.setName('close')
						.setDescription('Close a ticket')
						.addStringOption((option) =>
							option.setName('ticket_id').setDescription('The id of the ticket to close').setAutocomplete(true)
						)
				)
				.addSubcommandGroup((subcommandGroup) =>
					subcommandGroup
						.setName('user')
						.setDescription('manage users in tickets')
						.addSubcommand((subcommand) =>
							subcommand
								.setName('add')
								.setDescription('Add a user to a ticket')
								.addUserOption((option) => option.setName('user').setDescription('The user to add'))
								.addStringOption((option) => option.setName('ticket_id').setDescription('The ID of the ticket').setAutocomplete(true))
						)
						.addSubcommand((subcommand) =>
							subcommand
								.setName('remove')
								.setDescription('Remove a user from a ticket')
								.addUserOption((option) => option.setName('user').setDescription('The user to remove'))
								.addStringOption((option) => option.setName('ticket_id').setDescription('The ID of the ticket').setAutocomplete(true))
						)
				)
		);
	}

	public override async autocompleteRun(interaction: Subcommand.AutocompleteInteraction) {
		const focusedOption = interaction.options.getFocused(true);

		if (focusedOption.name !== 'ticket_id') return;

		const search = interaction.options.getString('ticket_id') ?? undefined;
		const tickets = await this.container.prisma.ticket.findMany({
			where: {
				OR: [
					{
						id: extractFirstNumberFromString(search)
					},
					{
						reason: {
							contains: search ?? undefined
						}
					}
				]
			}
		});

		return interaction.respond(
			tickets.map((ticket) => ({
				name: `${ticket.id} | ${ticket.reason}`,
				value: ticket.id.toString()
			}))
		);
	}

	public async chatInputCreateTicket(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		const member = interaction.options.getMember('user');
		if (!member) return interaction.reply('Sorry, an invalid user was provided');

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
					content: `## New ticket\n**Opened by:** ${interaction.user}\n**For:** ${member.user}\n**Reason:** ${reason}`,
					components: [
						new ActionRowBuilder<ButtonBuilder>().addComponents(
							new ButtonBuilder().setCustomId(`ticket.close.${ticketId}`).setLabel('Close').setStyle(ButtonStyle.Danger)
						)
					]
				}),

				this.container.utilities.modlogUtilities.sendDmToUser(
					member.id,
					new EmbedBuilder()
						.setTitle('Ticket opened')
						.setDescription(`A ticket was opened for you by <@${interaction.user.id}>`)
						.addFields({
							name: 'Reason',
							value: reason
						})
				)
			]);

			return interaction.editReply(`Ticket created successfully, it can be found at <#${ticketChannel.id}>`);
		} catch (error) {
			this.container.logger.error(error);
			return interaction.editReply(`I'm sorry, an error occurred whilst creating a ticket. Please try again or inform a staff member`);
		}
	}

	public async chatInputCloseTicket(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		let ticketId = interaction.options.getString('ticket_id', false);

		if (!ticketId) {
			const ticket = await this.container.prisma.ticket.findFirst({
				where: {
					channelId: BigInt(interaction.channelId)
				}
			});

			if (ticket) ticketId = ticket.id.toString();
			console.log(ticketId);
		}

		if (!ticketId)
			return interaction.reply({
				content:
					'Invalid ticket id provided and this is not a channel that has a ticket assigned to it. Please try again in a ticket channel or provide a ticket id'
			});

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

	public async chatInputUserAdd(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		try {
			const userToAdd = interaction.options.getMember('user');
			if (!userToAdd) return interaction.reply('Sorry, an invalid user was provided');

			const ticket = await this.container.prisma.ticket.findFirst({
				where: {
					OR: [
						{
							id: Number(interaction.options.getString('ticket_id'))
						},
						{
							channelId: BigInt(interaction.channelId)
						}
					]
				}
			});
			if (!ticket) return interaction.reply('sorry, no valid ticket was found with that ID or the current channel');

			const ticketChannel = <TextChannel>await interaction.guild.channels.fetch(String(ticket.channelId));
			if (!ticketChannel) return interaction.reply('Sorry, I couldnt get the channel for that ticket');

			if (userToAdd.permissionsIn(ticketChannel).has('ViewChannel')) return interaction.reply('That user can already see this channel');

			await ticketChannel.permissionOverwrites.edit(userToAdd.id, {
				ViewChannel: true
			});

			await ticketChannel.send(`${userToAdd} was added to this ticket by ${interaction.user}`);

			return interaction.reply({ content: 'User added to channel successfully', ephemeral: true });
		} catch (error) {
			this.container.logger.error(error);
			return interaction.reply('An error occurred whilst performing this action');
		}
	}

	// yes i just duplicated the above code lol
	public async chatInputUserRemove(interaction: Subcommand.ChatInputCommandInteraction<'cached'>) {
		try {
			const userToRemove = interaction.options.getMember('user');
			if (!userToRemove) return interaction.reply('Sorry, an invalid user was provided');

			const ticket = await this.container.prisma.ticket.findFirst({
				where: {
					OR: [
						{
							id: Number(interaction.options.getString('ticket_id'))
						},
						{
							channelId: BigInt(interaction.channelId)
						}
					]
				}
			});
			if (!ticket) return interaction.reply('sorry, no valid ticket was found with that ID or the current channel');

			if (userToRemove.id === String(ticket.opener)) return interaction.reply('Sorry, you cannot remove the ticket opener from their ticket');

			const ticketChannel = <TextChannel>await interaction.guild.channels.fetch(String(ticket.channelId));
			if (!ticketChannel) return interaction.reply('Sorry, I couldnt get the channel for that ticket');

			if (!userToRemove.permissionsIn(ticketChannel).has('ViewChannel')) return interaction.reply('That user is not able to see this channel');

			await ticketChannel.permissionOverwrites.edit(userToRemove.id, {
				ViewChannel: false
			});

			await ticketChannel.send(`${userToRemove} was removed from this ticket by ${interaction.user}`);

			return interaction.reply({ content: 'User removed from channel successfully', ephemeral: true });
		} catch (error) {
			this.container.logger.error(error);
			return interaction.reply('An error occurred whilst performing this action');
		}
	}
}

const extractFirstNumberFromString = (searchString: string | undefined) => {
	const match = searchString?.match(/\d+/);
	return match ? Number(match[0]) : undefined;
};
