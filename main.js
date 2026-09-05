import {
    makeWASocket,
    useMultiFileAuthState,
    fetchLatestBaileysVersion,
    DisconnectReason
} from "@whiskeysockets/baileys";
import pino from "pino";
import { global } from "./settings.js";
import fs from "fs";

const connectToWEA = async () => {
    const { state, saveCreds } = await useMultiFileAuthState("./session");
    const { version, isLatest } = await fetchLatestBaileysVersion();
    const logger = pino({ level: "silent" });

    const sock = makeWASocket({
        auth: state,
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

            console.log("==================================");
            console.log("== PAIRING CODE KAMU:", code, " ==");
            console.log("==================================");
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
        const m = messages[0];
        const sender = m.key.remoteJid;
        const username = m.pushName;
        const jid = m.key.remoteJidAlt || m.key.participantAlt;
        const lid = m.key.participant || m.key.remoteJid;
        const isGroup = sender.includes("@g.us");
        const text =
            m.message?.conversation ||
            m.extendedTextMessage?.text ||
            m.imageMessage?.caption;

        const args = text.slice(global.prefix.length).split(" ");
        const cmd = args.shift().toLowerCase();
        const query = args.join(" ");

        console.log({ sender, username, jid, lid, isGroup, text, cmd, query });
    });
};

connectToWEA();
