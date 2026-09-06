import axios from "axios";

export const handleCase = async ({ sock, sender, cmd, query }) => {
    switch (cmd) {
        case "ping":
            sock.sendMessage(sender, { text: "pong!" });
            break;
        case "ytmp3":
            if (!query) {
                return sock.sendMessage(sender, {
                    text: "cnth .ytmp3 https://youtube.com/.."
                });
            }

            try {
                const url = `https://v2.api-varhad.my.id/download/ytmp3?url=${query}`;

                const { data } = await axios.get(url);

                return sock.sendMessage(sender, {
                    audio: { url: data.result.download },
                    mimetype: "audio/mpeg"
                });
            } catch (err) {
                return sock.sendMessage(sender, { text: "terjadi kesalahan" });
            }
            break;
        default:
            return 0;
    }
};
