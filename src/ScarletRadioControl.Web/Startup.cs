using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ScarletRadioControl.Web;

public class Startup(
	IConfiguration configuration,
	IWebHostEnvironment webHostEnvironment
)
{

	private readonly IConfiguration configuration = configuration;
	private readonly IWebHostEnvironment webHostEnvironment = webHostEnvironment;

	public void Configure(IApplicationBuilder applicationBuilder)
	{
		applicationBuilder
			.UseHttpsRedirection();
		applicationBuilder
			.UseRouting();
		applicationBuilder
			.UseAuthorization();
		applicationBuilder
			.UseEndpoints(endpointRouteBuilder =>
			{
				endpointRouteBuilder.MapControllers();
				endpointRouteBuilder.MapStaticAssets();
				endpointRouteBuilder.MapOpenApi();
				endpointRouteBuilder.MapFallbackToFile("/index.html");
			});
	}

	public void ConfigureServices(IServiceCollection serviceCollection)
	{
		serviceCollection
			.AddControllers()
			.AddJsonOptions(jsonOptions =>
			{
				jsonOptions.JsonSerializerOptions.Converters.Add(new JsonStringEnumConverter());
				jsonOptions.JsonSerializerOptions.NumberHandling = JsonNumberHandling.Strict;
			});
		serviceCollection
			.AddOpenApi();
	}

}
