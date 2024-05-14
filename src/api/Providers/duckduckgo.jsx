export const DuckDuckGoProvider = "DuckDuckGoProvider";

const status_url = "https://duckduckgo.com/duckchat/v1/status",
    chat_url = "https://duckduckgo.com/duckchat/v1/chat";

const user_agent = 'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:123.0) Gecko/20100101 Firefox/123.0';
const headers = {
        'User-Agent': user_agent,
        'Accept': 'text/event-stream',
        'Accept-Language': 'de,en-US;q=0.7,en;q=0.3',
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': 'https://duckduckgo.com/',
        'Content-Type': 'application/json',
        'Origin': 'https://duckduckgo.com',
        'Connection': 'keep-alive',
        'Cookie': 'dcm=1',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        'Pragma': 'no-cache',
        'TE': 'trailers'
    };
export const getDuckDuckGoResponse = async function* (chat, model, max_retries = 5) {

}