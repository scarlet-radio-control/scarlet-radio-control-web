import { AnonymousAuthenticationProvider,  } from "@microsoft/kiota-abstractions";
import { FetchRequestAdapter } from "@microsoft/kiota-http-fetchlibrary";
import { useState } from "react";
import { createApiClient } from "../kiota/output/apiClient";

export default function useApiClient() {
    const [apiClient] = useState(() => {
        const anonymousAuthenticationProvider = new AnonymousAuthenticationProvider();
        const fetchRequestAdapter = new FetchRequestAdapter(anonymousAuthenticationProvider);
        return createApiClient(fetchRequestAdapter);
    });
    return apiClient;
}
