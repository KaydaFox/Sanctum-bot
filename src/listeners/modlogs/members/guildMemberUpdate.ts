import { ApplyOptions } from '@sapphire/decorators';
import { Events, Listener, type ListenerOptions } from '@sapphire/framework';
import type { GuildMember } from 'discord.js';

@ApplyOptions<ListenerOptions>({
	event: Events.GuildMemberUpdate
})
export class GuildMemberUpdateListener extends Listener {
	public run(oldMember: GuildMember, newMember: GuildMember) {
		if (!oldMember.communicationDisabledUntil && newMember.communicationDisabledUntil) {
			return this.container.client.emit('guildTimeoutAdd', newMember);
		}

		if (oldMember.communicationDisabledUntil && !newMember.communicationDisabledUntil) {
			return this.container.client.emit('guildTimeoutRemove', newMember);
		}

		return null;
	}
}
