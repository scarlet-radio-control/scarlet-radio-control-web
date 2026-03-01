import { useParams } from "react-router-dom";

export default function Control() {
    const { id } = useParams<{id: string}>();

    return (
        <div>
            <h1>Device Control</h1>
            <p>Controlling device with ID: {id}</p>
        </div>
    );
}
