using System.Threading.Tasks;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Hosting;

namespace ScarletRadioControl.Web;

public class Program
{

	public static async Task Main(string[] args)
	{
		var host = Host.CreateDefaultBuilder(args)
			.ConfigureWebHostDefaults(webHostBuilder =>
			{
				webHostBuilder.UseStartup<Startup>();
			})
			.Build();
		await host.RunAsync();
	}

}
