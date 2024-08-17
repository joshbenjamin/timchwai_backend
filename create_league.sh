 #!/bin/bash

LEAGUE_NAME="Premier League"  # Change this to your desired league name

for i in {1..20}; do  # Loop through count values from 1 to 10
  echo "Running league processing for count $i..."
  node --max_old_space_size=4096 scraperController.js -f league --leagueName "$LEAGUE_NAME" --count $i
  
  # Optional: Add a delay between runs if needed
  # sleep 1
done
