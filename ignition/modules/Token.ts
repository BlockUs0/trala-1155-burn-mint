import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TokenModule = buildModule("TokenModule", (m) => {
    const tickers = [
        { name: "Good Luck Have Fun !", symbol: "GLHF" },
        // { name: "KOI Token", symbol: "KOIB" },
        // { name: "Shark Token", symbol: "SHRK" }
    ];

    const tokens: Record<string, any> = {};

    tickers.forEach((ticker, index) => {
        const implementation = m.contract(
            "Token",
            [ticker.name, ticker.symbol],
            {
                id: `Token_${ticker.symbol}_Implementation`,
            }
        );

        const proxy = m.contract(
            "TokenProxy",
            [implementation, "0x"],
            {
                id: `Token_${ticker.symbol}_Proxy`,
            }
        );

        tokens[`${ticker.symbol}_implementation`] = implementation;
        tokens[`${ticker.symbol}_proxy`] = proxy;
    });

    return tokens;
});

export default TokenModule;