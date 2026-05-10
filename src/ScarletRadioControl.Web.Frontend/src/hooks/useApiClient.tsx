import { AnonymousAuthenticationProvider,  } from "@microsoft/kiota-abstractions";
import { FetchRequestAdapter } from "@microsoft/kiota-http-fetchlibrary";
import { useEffect, useState } from "react";
import { createApiClient, type ApiClient } from "../kiota/output/apiClient";

export default function useApiClient() {
    const [apiClient, setApiClient] = useState<ApiClient | undefined>(undefined);

    useEffect(() => {    
        const anonymousAuthenticationProvider = new AnonymousAuthenticationProvider();
        const fetchRequestAdapter = new FetchRequestAdapter(anonymousAuthenticationProvider);
        const newApiClient = createApiClient(fetchRequestAdapter);
        setApiClient(newApiClient);

        return () => {};
    }, []);
    return apiClient;
}
