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

	public async Task SendOffer(string deviceId, string targetConnectionId, object rtcSessionDescriptionInit)
	{
		await this.Clients.Client(targetConnectionId).ReceiveOffer(this.Context.ConnectionId, rtcSessionDescriptionInit);
	}

	public async Task SendAnswer(string deviceId, string targetConnectionId, object rtcSessionDescriptionInit)
	{
		await this.Clients.Client(targetConnectionId).ReceiveAnswer(this.Context.ConnectionId, rtcSessionDescriptionInit);
	}

	public async Task SendIceCandidate(string deviceId, string targetConnectionId, object rtcIceCandidate)
	{
		await this.Clients.Client(targetConnectionId).ReceiveIceCandidate(this.Context.ConnectionId, rtcIceCandidate);
	}

	public interface IWebRtcClient
	{
		Task PeerJoined(string connectionId);

		Task ReceiveOffer(string fromConnectionId, object rtcSessionDescriptionInit);

		Task ReceiveAnswer(string fromConnectionId, object rtcSessionDescriptionInit);

		Task ReceiveIceCandidate(string fromConnectionId, object rtcIceCandidate);
	}

}
