using System.Threading.Tasks;
using Microsoft.AspNetCore.SignalR;

namespace ScarletRadioControl.Web.Hubs;

public class WebRtcHub : Hub<WebRtcHub.IWebRtcClient>
{

	public async Task ReceiverJoin(string deviceId)
	{
		await this.Groups.AddToGroupAsync(this.Context.ConnectionId, deviceId);
		await this.Clients.OthersInGroup(deviceId).ReceiverJoined(this.Context.ConnectionId);
	}

	public async Task SenderJoin(string deviceId)
	{
		await this.Groups.AddToGroupAsync(this.Context.ConnectionId, deviceId);
		await this.Clients.OthersInGroup(deviceId).SenderJoined(this.Context.ConnectionId);
	}

	public async Task SenderSendOffer(string deviceId, string targetConnectionId, object offer)
	{
		await this.Clients.Client(targetConnectionId).ReceiverReceiveOffer(this.Context.ConnectionId, offer);
	}









	public async Task JoinRoom(string roomId)
	{
		await this.Groups.AddToGroupAsync(this.Context.ConnectionId, roomId);
		await this.Clients.OthersInGroup(roomId).PeerJoined(this.Context.ConnectionId);
	}

	public async Task SendOffer(string roomId, string targetConnectionId, object offer)
	{
		await this.Clients.Client(targetConnectionId).ReceiveOffer(this.Context.ConnectionId, offer);
	}

	public async Task SendAnswer(string roomId, string targetConnectionId, object answer)
	{
		await this.Clients.Client(targetConnectionId).ReceiveAnswer(this.Context.ConnectionId, answer);
	}

	public async Task SendIceCandidate(string roomId, string targetConnectionId, object candidate)
	{
		await this.Clients.Client(targetConnectionId).ReceiveIceCandidate(this.Context.ConnectionId, candidate);
	}

	public interface IWebRtcClient
	{
		Task ReceiveAnswer(string fromConnectionId, object answer);



		Task ReceiverJoined(string connectionId);
		Task SenderJoined(string connectionId);







		Task PeerJoined(string connectionId);

		Task ReceiveOffer(string fromConnectionId, object offer);

		Task ReceiveAnswer(string fromConnectionId, object answer);

		Task ReceiveIceCandidate(string fromConnectionId, object candidate);
	}

}
