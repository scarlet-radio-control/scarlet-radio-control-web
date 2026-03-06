import { AnonymousAuthenticationProvider,  } from "@microsoft/kiota-abstractions";
import { FetchRequestAdapter } from "@microsoft/kiota-http-fetchlibrary";
import { useRef, useEffect } from "react";
import { createApiClient, type ApiClient } from "../kiota/output/apiClient";

export default function useApiClient() {
    const apiClientRefObject = useRef<ApiClient>(null);

    useEffect(() => {    
        const anonymousAuthenticationProvider = new AnonymousAuthenticationProvider();
        const fetchRequestAdapter = new FetchRequestAdapter(anonymousAuthenticationProvider);
        apiClientRefObject.current = createApiClient(fetchRequestAdapter);

        return () => { };
    }, []);
    return apiClientRefObject;
}
