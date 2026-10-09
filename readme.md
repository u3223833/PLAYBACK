# ASSESSMENT 2: WEB APPLICATION DEVELOPMENT (11841)
## STUDENT ID: u3223833 

# PLAY BACK - Australian TV Game Show Archive

# PROJECT OVERVIEW
PLAY BACK is a web app for exploring Australian television game shows in the National Film and Sound Archive of Australia (NFSA) collection. You can browse by decade, narrow the results with genre filters or search, and open a show to see more information about its archival record.The idea is to make the collection feel like somewhere to wander around, rather than a database where you need to know exactly what you are looking for.


# RUNNING LOCALLY
* 1. Clone or download this repository.
* 2. Open index.html in a browser.
* 3. If the browser blocks API requests when    opening the file directly, serve the folder instead. In VS Code, you can use the Live Server extension, or run python3 -m http.server from the project folder and visit http://localhost:8000.
* 4. An internet connection is needed because the app requests data from the live NFSA API.


## PROJECT STRUCTURE
 index.html
 README.md
 assets/
    css/
     reset.css
     styles.css
    js/
     script.js

## API
*PLAYBACK uses 2 endpoints:*

**GET/search:** Searches for Australian television game-show records by decade, using catalogue fields and paginated results.

**GET/title/{id}:** Retrieves the full catalogue record for an individual result so the app can show more detail.

The API is live, so results depend on the records and metadata currently available from the NFSA. Individual records may have incomplete information.

# How it works
The app uses JavaScript to manage the selected decade, search and genre filters. It groups episode records under each programme, caches data to reduce repeated API requests, and prevents older requests from overwriting newer results. Live counters update to show the number of programmes and archival records currently displayed.

## Loading, empty, and error states
The interface gives feedback while results load, when no results match, and when the API cannot be reached. Where possible, an error message includes a retry option.

# Design Rationale
## Concept and audience
The brief asks for a generous interface to a cultural collection: something that communicates the scale and variety of the archive and encourages exploration (Whitelaw, 2015). I focused on Australian television game shows because they are familiar, have a strong connection to popular culture and changed a lot across different decades. Organising the collection by era gives people a way in even if they do not have a particular programme in mind.

## Generous interface and information flaneur
The decade timeline encourages users to explore the collection without needing to know a programme's name beforehand. Grouping episode records into programme cards reduces repetition and makes the collection easier to scan. Search and genre filters provide a more direct way to find relevant results, balancing open-ended discovery with purposeful searching. Together, these features support Whitelaw's concept of generous interfaces and Dörk et al.'s (2011) information flâneur.

## Visual design
The design takes inspiration from an old television set. Each programme appears on a small TV-style card, with screen details, knobs and speaker lines. This gives the cards a visual identity that fits the subject without relying on archival images being available for every record.
The rainbow stripe and coloured genre chips reference television test cards and broadcast graphics. The warm cream background and bold display typography give the page the feel of a printed television guide. CSS variables keep the colours and typography consistent.

## Changes from the Assessment 1
The main concept and visual direction stayed the same. I refined the interface rather than redesigning it:
* The genre chips use colours that connect with the rainbow stripe under the header.
* The counters respond to the current results, helping users see how their filters affect the collection.
* I removed the eyebrow headings and trimmed back some descriptive text so the programme cards and their metadata have more room.
* I added a search box with a clear button, based on the feedback from Assessment 1.

## Challenges
The main challenge was accessing archival images and video through the NFSA API. I investigated the returned media information and tested different approaches, but I could not get the material to display reliably on my site. Rather than abandon the concept, I kept the TV-inspired cards and focused on presenting the available catalogue information. With more time, I would investigate media explicitly available for external use or embedding.


## Limitations

The experience is limited by the availability of information in the NFSA catalogue. Some records have incomplete metadata, and archival images or video could not be reliably displayed. Genre filters also depend on catalogue information and keyword matching, so some programmes may not be categorised perfectly. Future development could include accessible archival media, improved filtering and additional ways to save or compare programmes.


## Technical decisions
I used vanilla HTML, CSS and JavaScript to build on my original static prototype without introducing an unnecessary framework. Caching reduces repeated API requests, while request handling helps prevent outdated results from replacing newer selections. Keyboard interactions, Escape-to-close functionality, loading and error messages, reduced-motion styling and a responsive card grid support accessibility and use across different screen sizes.

## References
Dörk, M., Carpendale, S., & Williamson, C. (2011). The information flâneur: A fresh look at information seeking. In Proceedings of the SIGCHI Conference on Human Factors in Computing Systems (pp. 1215–1224). ACM. https://doi.org/10.1145/1978942.1979124

MDN Web Docs. (n.d.). Cross-Origin Resource Sharing (CORS). Mozilla. https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

National Film and Sound Archive of Australia. (n.d.). NFSA Collection API. https://api.collection.nfsa.gov.au

Whitelaw, M. (2015). Generous interfaces for digital cultural collections. Digital Humanities Quarterly, 9(1). http://www.digitalhumanities.org/dhq/vol/9/1/000205/000205.html

