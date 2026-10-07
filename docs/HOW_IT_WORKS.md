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
2. How long until **that car** arrives, judged from its sound.

Sighted people learn this by watching thousands of crossings. A blind traveller
has to learn both durations by feel, and nobody teaches it systematically.
Orientation and mobility instructors often say "count to eight". But at a real
kerb nobody counts, and counting under stress is unreliable.

**The design rule behind everything:** the app never gives a number of seconds.
It plays durations back as sound and vibration, because that is the form the
judgement will take on the street. You learn a duration in the same channel you
will use it in.

The four parts of the app are the four steps of teaching that skill, in order.
Each depends on the one before, which is why parts 2 to 4 stay locked until
part 1 has been done.

| # | Part | Teaches | Where |
|---|---|---|---|
| 1 | Measure my crossing | What my crossing time **is** | At the real street |
| 2 | Practise my timing | How my crossing time **feels** | Anywhere |
| 3 | Compare practice | Comparing a gap with my crossing | Anywhere, no traffic |
| 4 | At the street | The same comparison with real cars | On the pavement, safely |

---

## Part 1. Measure my crossing

### What it is for

Finding out how long this person's crossing really takes. This becomes the
reference that everything else is compared against.

### Why it exists

The feedback in every other part is "were you close to your crossing time".
Without a real measurement, that feedback means nothing. And the measurement has
to be **theirs**. A tall, fast walker and a slower person using a cane can differ
by several seconds on the same street.

### How it works

The person walks the actual street three times with the phone in hand. They tap
at the kerb, at the middle, and at the far side.

- **Three walks**, because one walk can be a fluke. The app averages them and
  warns if the walks disagree by more than three quarters of a second.
- **After each walk the app plays the duration straight back**, so the learning
  starts immediately. They hear how long their crossing is before anything else
  happens.
- **Save as my crossing times** stores two numbers: the time to clear the near
  lane, and the full street time. Those two numbers unlock parts 2 to 4.

### When to use it

Once per street the person uses often. Again whenever circumstances change:
tiredness, heavy bags, winter clothing, a different street.

### For a demonstration

Nobody walks a street in an office. On the home screen, **Try it now with
example times** loads 4 seconds and 8 seconds instead, and the app announces
that these are examples rather than the user's own.

---

## Part 2. Practise my timing: the heart of the app

### What it is for

Building the **felt sense** of the person's own crossing duration, so that at a
kerb they know in their body how long they need.

### Why it exists

This is the skill itself. Knowing "my crossing is 8 seconds" as a fact is
useless at a kerb. Knowing it as a feeling, the way a musician knows a tempo, is
what lets someone judge a gap instantly, without counting.

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

**The lesson is the gap between the two sounds.** Not a number. After enough
repetitions the chime comes more and more often. That means the duration has
moved into the body.

### When to use it

Often, and briefly. Five minutes a day is better than one long hour.

---

## Part 3. Compare practice

### What it is for

Practising the actual safety judgement, comparing a car's warning time with the
crossing time, without any traffic at all.

### Why it exists

Part 2 teaches one duration. Crossing safely means **comparing two**. This part
trains the comparison in a safe room. No instructor can otherwise do this,
because you cannot schedule cars to arrive at useful intervals.

### How it works

1. The app plays a gap: a sound of some length. That is a simulated **warning
   time**, the time from first hearing a car until it arrives.
2. The person answers with one of three large buttons:
   **Shorter than my crossing**, **About the same**, **Longer than my crossing**.
3. A right answer earns the chime. A wrong answer makes the app play the gap
   and then their crossing time back to back, so they hear exactly how they
   misjudged.

"Shorter" is the dangerous answer. It means there is not enough time to cross.

The person can choose which crossing to compare against (near lane or full
street), and whether the gap plays as one continuous sound or as two taps with
silence between. After a correct answer, the app can also ask them to tap out
*how much* longer or shorter the gap was.

### When to use it

After part 2 feels solid. Anywhere, any time, no street needed.

---

## Part 4. At the street

### What it is for

The same judgement as part 3, made against real cars, from a safe place on the
pavement.

### Why it exists

Simulated gaps are clean. Real cars have engine notes, wind, echoes off
buildings, and background noise. This part carries the skill over into reality,
with the app checking each judgement so the person is never guessing alone.

### How it works

1. Choose which direction the car is coming from. A car from the left only
   needs the near-lane time. A car from the right needs the full street time.
2. One big button. Tap when they **first hear** the car. Tap again when it
   **passes** them.
3. The app says whether that car would have given enough time to cross.
4. **Cancel** throws the trial away if the car turned off or never came.

Before starting, **Sample the quiet** has the app listen to the background for
three seconds. Any car measured while the surroundings are much louder than
that baseline gets flagged. The reason: in noise you hear cars later, so the
warning time you measured is shorter than the real one, and should not be
trusted. The microphone measures loudness only. Nothing is recorded or sent.

### When to use it

Last, with an instructor present, from the kerb. Never in the road.

---

## The supporting parts

### Progress

Accuracy for each part, a strip of recent attempts, and the **adaptive margin**
switch, which tightens the tolerance as the person improves so the chime gets
harder to earn. It can also produce a written report to send to an instructor.
The report is shown in full first and is never sent automatically.

### Accessibility

Output mode (sound, visual, or both), vibration, text size up to three times,
colour schemes including yellow on black, high contrast, and screen-reader
announcements. The app quietens the screen reader during playback on purpose,
so it does not talk over the sounds.

Vibration is the reason this is a native app at all. Safari on iPhone cannot
vibrate, and for a DeafBlind user vibration is the entire interface.

### Share time settings

An instructor measures a student's times once and sends a link. Opening the link
writes those times into the student's copy of the app. The student never types
a number.

### Privacy

No account, no sign-in, no network. Everything stays on the phone. The person
can delete all their history at any time from Progress.

---

## The whole app in one paragraph

The app teaches a blind traveller to feel two durations, their own crossing and
a car's approach, and to compare them. Part 1 measures the crossing. Part 2
turns that duration into a feeling. Part 3 practises comparing it with a gap,
safely indoors. Part 4 does the same with real cars. It never shows a number,
because at the kerb nobody is counting.
