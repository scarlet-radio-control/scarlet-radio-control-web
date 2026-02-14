using System.Collections.Generic;
using System.Net.Mime;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace ScarletRadioControl.Web.Controllers.API.V1;

[ApiController]
[ApiExplorerSettings(GroupName = "v1")]
[Route("/api/v1/stun")]
public class WebRtcController : ControllerBase
{

	[HttpGet("rtc-configuration")]
	[ProducesResponseType<RTCConfiguration>(StatusCodes.Status200OK, MediaTypeNames.Application.Json)]
	[ProducesResponseType<ProblemDetails>(StatusCodes.Status500InternalServerError, MediaTypeNames.Application.Json)]
	public async Task<IActionResult> GetRtcPeerConnectionConfigurationAsync()
	{
		await Task.CompletedTask;
		var rtcConfiguration = new RTCConfiguration
		{
			IceServers = new List<RTCIceServer>
			{
				new RTCIceServer
				{
					Credential = null,
					Urls = new List<string>
					{
						"stun:stun.l.google.com:19302"
					},
					Username = null
				}
			}
		};
		return this.Ok(rtcConfiguration);
	}

	public record RTCConfiguration {
		public required ICollection<RTCIceServer>? IceServers { get; init; }
	}

	public record RTCIceServer {
		public required string? Credential { get; init; }
		public required ICollection<string>? Urls { get; init; }
		public required string? Username { get; init; }
	}

}
