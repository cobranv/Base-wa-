import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import { global } from "./settings.js";

const connectToWEA = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
        auth: {
            creds: state.creds
        },
        version,
        logger,
        printQRInTerminal: false,
        browser: ["Linux", "Chrome", "20.0.04"],
        markOnlineOnConnect: true,
        generateHighQualityLinkPreview: true,
        syncFullHistory: false
    });

    const reqPair = async () => {
        try {
            const phoneNumber = global.phoneNumber;

            console.log("Meminta pairing kode");
            await new Promise(res => setTimeout(res, 6000));

            const code = await sock.requestPairingCode(phoneNumber);

            console.log("==============================");
            console.log("PAIRING CODE KAMU:", code);
            console.log("==============================");
        } catch (err) {
            console.log(err);
        }
    };

    if (!sock.authState.creds.registered) {
        await reqPair();
    }

    sock.ev.on("creds.update", saveCreds);

    sock.ev.on("connection.update", update => {
        const { connection, lastDisconnect, qr } = update;

        if (connection === "connecting") console.log("Sedang menghubungkan");

        if (connection === "connecting") {
            console.log("Sedang menghubungkan ke WhatsApp...");
        }

        if (connection === "open") {
            console.log("Berhasil Terhubung ke WhatsApp!");
        }

        if (connection === "close") {
            const reason = lastDisconnect?.error?.output?.statusCode;
            const message = lastDisconnect?.error?.message;
            console.log(`Koneksi Terputus. Alasan: ${reason} (${message})`);

            if (reason === DisconnectReason.loggedOut) {
                console.log("Sesi telah keluar. Menghapus folder session...");
                if (fs.existsSync("./session")) {
                    fs.rmSync("./session", { recursive: true, force: true });
                }
                process.exit(0);
            } else if (reason === 428 || reason === 405) {
                console.log(
                    "Terjadi gangguan pairing/koneksi. Mencoba menghubungkan ulang dalam 10 detik..."
                );
                setTimeout(() => {
                    connectToWEA();
                }, 10000);
            } else {
                console.log("Menghubungkan ulang dalam 5 detik...");
                setTimeout(() => {
                    connectToWEA();
                }, 5000);
            }
        }
    });

    sock.ev.on("messages.upsert", ({ messages }) => {
        const msg = messages[0];
        console.log(msg);
    });
};

connectToWEA();
