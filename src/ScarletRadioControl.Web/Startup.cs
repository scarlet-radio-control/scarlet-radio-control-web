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
			.UseSwaggerUI(swaggerUIOptions =>
			{
				swaggerUIOptions.SwaggerEndpoint("/openapi/v1.json", "v1");
			});
		applicationBuilder
			.UseEndpoints(endpointRouteBuilder =>
			{
				endpointRouteBuilder.MapControllers();
				endpointRouteBuilder.MapHealthChecks("/health");
				endpointRouteBuilder.MapOpenApi();
				endpointRouteBuilder.MapStaticAssets();
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
			.AddHealthChecks();
		serviceCollection
			.AddOpenApi();
		serviceCollection
			.ConfigureHttpJsonOptions(jsonOptions =>
			{
				jsonOptions.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
				jsonOptions.SerializerOptions.NumberHandling = JsonNumberHandling.Strict;
			});
	}

}
