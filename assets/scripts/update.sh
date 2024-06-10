# Check that git is installed, else warn using stderr and exit
if ! command -v git &> /dev/null
then
    echo "git could not be found! Please install git and try again." 1>&2
    exit
fi

# Check that npm is installed, else warn using stderr and exit
if ! command -v npm &> /dev/null
then
    echo "npm could not be found! Please install npm and try again." 1>&2
    exit
fi

REPO_PATH=https://github.com/XInTheDark/raycast-g4f

# cd to root of project
cd "$(dirname "$0")/../.." || exit 1

# Clone the repo, forcefully replacing existing files
git clone --depth 1 $REPO_PATH temp || exit 1

echo "Download success! Installing..."

# -------- Installation --------

# move all files from temp to root, forcefully replacing existing files
mv -f temp/* .

# remove temp folder
rm -rf temp

# install dependencies
npm ci

# build
npm run build

echo "Installation success!"
exit 0