using System.Threading.Tasks;
using Microsoft.AspNetCore.Builder;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace ScarletRadioControl.Web;

public class Program
{

	public static async Task Main(string[] args)
	{
		var builder = WebApplication.CreateBuilder(args);

		// Add services to the container.

		builder.Services.AddControllers();
		builder.Services.AddOpenApi();

		var app = builder.Build();

		app.UseDefaultFiles();
		app.MapStaticAssets();

		app.MapOpenApi();

		app.UseHttpsRedirection();

		app.UseAuthorization();


		app.MapControllers();

		app.MapFallbackToFile("/index.html");

		await app.RunAsync();
	}

}
