using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ScarletRadioControl.Web.Hubs;

public class WebRtcHub : Hub<WebRtcHub.IWebRtcClient>
{

	public async Task JoinDevice(string deviceId)
	{
		await this.Groups.AddToGroupAsync(this.Context.ConnectionId, deviceId);
		await this.Clients.OthersInGroup(deviceId).PeerJoined(this.Context.ConnectionId);
	}

	public async Task SendOffer(string deviceId, string targetConnectionId, object offer)
	{
		await this.Clients.Client(targetConnectionId).ReceiveOffer(this.Context.ConnectionId, offer);
	}

	public async Task SendAnswer(string deviceId, string targetConnectionId, object answer)
	{
		await this.Clients.Client(targetConnectionId).ReceiveAnswer(this.Context.ConnectionId, answer);
	}

	public async Task SendIceCandidate(string deviceId, string targetConnectionId, object candidate)
	{
		await this.Clients.Client(targetConnectionId).ReceiveIceCandidate(this.Context.ConnectionId, candidate);
	}

	public interface IWebRtcClient
	{
		Task PeerJoined(string connectionId);

		Task ReceiveOffer(string fromConnectionId, object offer);

		Task ReceiveAnswer(string fromConnectionId, object answer);

		Task ReceiveIceCandidate(string fromConnectionId, object candidate);
	}

}
