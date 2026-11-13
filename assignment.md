# Radiology reporting challenge

## The brief

Radiologists read a study (a set of medical images) and write a report. While reading, they often mark a few images as key images: the ones that best show the finding. Those images travel with the report so the referring doctor sees what the radiologist saw.

Build a single-study reporting screen with two parts:

- **Image panel:** the images in the study, shown as thumbnails, with a way to view one larger.
- **Report panel:** an editable text report, with its list of key images.

The radiologist should be able to pick images from the study, add them to the report as key images, and manage them there. The result must survive a page reload, so it needs a back end with a real database. You own the feature end to end: interface, API, data and deployment.

## Must have

### Front end

- Show the study's images and let the user view one larger.
- Add an image to the report as a key image, and remove it.
- Reorder the key images.
- Add a short caption to each key image.
- Edit the report text.
- Handle loading, empty and error states.

### Back end

- Store the report, its key images, their order and captions in a real database, not in memory or in files.
- Expose an API that the front end uses for every read and every change, and load everything back on reload.
- Validate input on the server and return clear errors with the right status codes, for example for an unknown image or an invalid caption.
- Keep the stored order correct when key images are added, removed or reordered.

### Both

- Include a few tests on the parts you consider most important, with at least one that exercises the API.
- Deploy the front end and the back end somewhere we can open with a link.

## Your call

We have left these open deliberately. Decide, build what you decide, and explain it in your notes.

- How key images are added and reordered (drag and drop, buttons, keyboard, something else).
- When changes are saved (automatically, or on an explicit action) and what the user sees if a save fails.
- Whether there is a limit on key images, and what happens at the limit.
- What happens if the same image is added twice.
- How the screen behaves on a narrow window.
- The shape of the API and the data model.

## Ground rules

- AI tools are allowed. Use whatever you normally work with. You own every line you submit, and we will ask you to explain and change it in the interview.
- Stack is your choice. We would like TypeScript and React on the front end. Use any back end and database you can deploy.
- Use mock data. Any public or placeholder images will do. Do not use real patient data, and there is no need to handle medical image formats such as DICOM.
- No login needed. A single user and a single study are enough.
- Do not over-build. A small product that works well beats a large one with rough edges.

## What to submit

Send these three things within 48 hours of receiving the brief:

1. A link to the deployed app that works without any setup on our side.
2. A link to the repository, with your real commit history. Please do not squash it into one commit.
3. A short notes file in the repository, one page at most, covering:
   - How to run it locally.
   - The decisions you made on the open points, and why.
   - What you left out, and what you would do next with another day.
   - How you used AI tools, including one place where you corrected or rejected what they produced.
