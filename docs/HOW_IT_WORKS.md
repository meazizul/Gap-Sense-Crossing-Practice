# How Gap Sense Works, and Why Each Part Exists

A plain explanation of the whole app in one story, then each function on its
own: what it is for, why it was built, how it works, and when to use it.

---

## The one problem the app solves

A blind person stands at a street with no traffic light. A car is coming. The
only question that matters is:

**Do I have enough time to cross before it reaches me?**

To answer it, two durations have to be compared in the head:

1. How long **my** crossing takes.
2. How long until **that car** arrives, judged from its sound. Instructors
   call this the **warning time**: from first hearing or seeing a vehicle
   until it passes in front of you.

Sighted people learn this by watching thousands of crossings. A blind traveller
has to learn both durations by feel, and nobody teaches it systematically.
Orientation and mobility instructors often say "count to eight". But at a real
kerb nobody counts, and counting under stress is unreliable.

**The design rule behind everything:** the app never gives a number of seconds.
It plays durations back as sound and vibration, because that is the form the
judgement will take on the street. You learn a duration in the same channel you
will use it in.

The four parts of the app are the four steps of teaching that skill, in order.
All of them compare against the person's own crossing times, which is why they
stay locked until those times are set.

| # | Part | Teaches | Where |
|---|---|---|---|
| — | Your crossing times | Set by the instructor | At the real street |
| 1 | Practise my timing | How my crossing time **feels** | Anywhere |
| 2 | Time it from a signal | The same feeling when I do not choose the start | Anywhere |
| 3 | Compare practice | Comparing a warning time with my crossing | Anywhere, no traffic |
| 4 | At the street | The same comparison with real cars | On the pavement, safely |

---

## Before you start: your crossing times

### What they are

Two numbers: how long this person takes to cross the **first half** of the
street (the lanes with traffic from the left), and how long to cross the
**full street** (traffic from the right). Everything else is compared against
them.

### Why the instructor sets them

The measurement has to be **theirs**: a tall, fast walker and a slower person
using a cane can differ by several seconds on the same street. And it has to
be done properly. An O&M instructor times at least three crossings and uses
the **longest**, because if it took that long once, it may take that long
again. The start, the halfway point and the finish are chosen precisely. A
student pressing buttons on a phone while crossing cannot do that safely or
accurately, so an earlier version of the app that tried to measure the
crossing itself was removed.

### How they get into the app

The instructor types them in **Settings**, or sends the student a link that
sets them in one tap. The student never has to type a number.

### For a demonstration

Nobody times a crossing in an office. On the home screen, **Try it now with
example times** loads example values instead, and the app says plainly that
these are examples rather than the user's own.

---

## Part 1. Practise my timing: the heart of the app

### What it is for

Building the **felt sense** of the person's own crossing duration, so that at a
kerb they know in their body how long they need.

### Why it exists

This is the skill itself. Knowing "my crossing is 8 seconds" as a fact is
useless at a kerb. Knowing it as a feeling, the way a musician knows a tempo, is
what lets someone judge a warning time instantly, without counting.

### How it works

Sitting anywhere, the person:

1. Taps the big button. It reads **BEGIN**. This means "I am stepping off."
2. Waits as long as they believe the crossing takes, imagining the walk.
3. Taps again. The button reads **MARK**. This means "I have arrived."

The app then replays two things close together:

- **Their tap**, as a plain tone, at the moment they actually tapped.
- **The reference**, a feedback tone at the moment they *should* have tapped.

If the two sounds land together, they were right. The further apart the sounds,
the further off they were. The feedback tone also says which way:

- **Short, bright, high chime**: within the margin. Close enough.
- **Long, low, buzzing pulse**: outside the margin. Too far off.

The two are different in pitch, length and texture at the same time, so they
can never be confused, even through a phone speaker next to traffic. With
vibration turned on, the same three signals arrive by touch: one knock for the
tap, three knocks for within the margin, one long buzz for outside it.

**The lesson is the distance between the two sounds.** Not a number. After
enough repetitions the chime comes more and more often. That means the duration
has moved into the body. A line under the button keeps count of how many of the
last ten attempts were within the margin.

### When to use it

Often, and briefly. Five minutes a day is better than one long hour.

---

## Part 2. Time it from a signal

### What it is for

The same felt duration, but starting from a moment the person did not choose.

### Why it exists

In Part 1 the person starts the clock themselves, which gives them a rhythm:
tap now… and now. At a kerb nobody hands you the start. You hear a car coming,
you wait, and at some moment you must judge: *now* is when I would need to be
across. Cindi Lashinsky teaches exactly this at the kerb ("you hear a car
coming… wait… now") and asked whether the sense of time survives without the
rhythm of two taps. This part finds out.

### How it works

1. Choose which crossing. Press **READY**.
2. The app waits a random time. Longer waits can be switched on.
3. The signal: two quick blips, a pulse, and a flash. The button now reads
   **NOW**.
4. The person presses when they think their crossing time is up.
5. The replay is the same as Part 1: their press against the real crossing
   time, chime or pulse.

Pressing before the signal is a false start. The app says so and records
nothing.

### When to use it

Once Part 1 feels comfortable. Anywhere.

---

## Part 3. Compare practice

### What it is for

Practising the actual safety judgement, comparing a car's warning time with the
crossing time, without any traffic at all.

### Why it exists

Parts 1 and 2 teach one duration. Crossing safely means **comparing two**.
This part trains the comparison in a safe room. No instructor can otherwise do
this, because you cannot schedule cars to arrive at useful intervals.

### How it works

1. The person presses **Play a sample warning time**. The app plays a sound
   whose length stands for a vehicle's warning time. By default the sound
   grows louder, like a vehicle approaching, then stops; a quieter start can be
   adjusted with a loudness control. Two taps with silence between is the
   alternative.
2. The person answers: **Shorter than my crossing**, **About the same**, or
   **Longer than my crossing**. There are three large buttons, and there is a
   pad that takes a swipe up for longer, a swipe down for shorter, and a tap
   for about the same. With a screen reader, focus lands on the middle answer
   so one flick reaches either of the others.
3. **Every answer is followed by the replay.** The sample and the person's real
   crossing time start together. A marker at the start, the sample, a marker
   where the sample ends, and the feedback tone where the crossing time ends:
   the chime if the two were within the margin, the pulse if not. Which comes
   first says the direction; the distance between them says how much. It is
   the same vocabulary as Part 1, which is why it works.
4. Nothing starts by itself. The person presses Play for the next sample.

"Shorter" is the dangerous answer. It means there is not enough time to cross.

Options: a short random pause before the sample, so the start is not
predictable; and **tap out how much** longer or shorter it was before the
replay, after which the replay also plays their estimate against the real
difference.

### When to use it

After parts 1 and 2 feel solid. Anywhere, any time, no street needed.

---

## Part 4. At the street

### What it is for

The same judgement as part 3, made against real cars, from a safe place on the
pavement.

### Why it exists

Simulated warning times are clean. Real cars have engine notes, wind, echoes
off buildings, and background noise. This part carries the skill over into
reality, with the app checking each judgement so the person is never guessing
alone.

### How it works

1. Choose which direction the car is approaching from. From the left is
   compared with the first-half time. From the right is compared with the
   full-street time.
2. One big button. Tap when they **first hear** the car. Tap again when it
   **passes** them.
3. The app gives the verdict: enough warning, too close to rely on, or not
   enough. Then it replays that warning time against the crossing time, the
   same way as Part 3.
4. **Cancel** throws the trial away if the car turned off or never came.

**Background noise check, experimental.** Off unless switched on. With it on,
**Sample the quiet** has the app listen to the background for three seconds,
and any car measured while the surroundings are much louder than that baseline
gets flagged. The reason: in noise you hear cars later, so the warning time you
measured is shorter than the real one, and should not be trusted. The
microphone is opened only while the check is on and this screen is showing, it
measures loudness only, and nothing is recorded or sent. Whether it works
reliably across phones, pockets and hands is an open question, so a flag is a
hint, not a verdict.

### When to use it

Last, with an instructor present, from the kerb. Never in the road.

---

## The supporting parts

### Progress

Accuracy for each part, a strip of recent attempts, and the experimental
**adaptive margin** switch. When on, each activity and street type keeps its
own margin, which tightens slowly while the person keeps succeeding and goes
straight back to the instructor's margin when they do not. It is off by
default: the research on the right pace does not exist yet, and the instructor
decides.

Progress also produces a written report for the instructor. It is shown in full
first and is never sent automatically. **Email it to my instructor** opens the
phone's mail app with the report filled in; the person presses Send. The report
names the person by a short client code, never a name.

### Accessibility

Output mode (sound, visual, or both), vibration, text size up to three times,
colour schemes including yellow on black, high contrast, and screen-reader
announcements. The app quietens the screen reader during playback on purpose,
so it does not talk over the sounds; everything else is spoken at once.

Vibration is the reason this is a native app at all. Safari on iPhone cannot
vibrate, and for a DeafBlind user vibration is the entire interface.

### Share time settings

An instructor measures a student's times once and sends a link. Opening the link
writes the two crossing times, the margin, the instructor's email and the
student's client code into the student's copy of the app. The student never
types a number. The link carries a code, not a name, because it travels by
ordinary email or text.

### Privacy

No account, no sign-in, no network. Everything stays on the phone. The
microphone is used only when the optional background-noise check is switched
on, and then only to measure loudness. The person can delete all their history
at any time from Progress.

---

## The whole app in one paragraph

The app teaches a blind traveller to feel two durations, their own crossing and
a car's approach, and to compare them. The instructor sets the crossing times.
Part 1 turns that duration into a feeling. Part 2 asks for the same feeling
when the start is not the person's own. Part 3 practises comparing it with a
sample warning time, safely indoors. Part 4 does the same with real cars. It
never shows a number, because at the kerb nobody is counting.
