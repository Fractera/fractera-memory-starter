# "Which of my friends could have known the mayor?" — how I answer it

## What the question actually needs

To say that Denis, Misha or Yulia could have known the mayor, I need something recorded that
touches the mayor: a workplace, an office, an event, a shared third person, a period of time in the
same institution. What I hold about all three is their names and the fact that this person calls
them friends. The city (Kazan) and the language (Russian) belong to the person, not to the friends.
So the question is not answered by what I already know, and the ladder starts.

The caller sent no depth parameter. That fixes my ceiling before I begin: levels four and five are
opened by the caller's explicit request, and no such request arrived. My work happens on levels one
to three, and I stop there whatever the outcome.

## Level 1 — the database, no model

First I do the plain lookups, because a query to a store costs nothing and deliberating about it
already costs more than making it. Three of them, in one pass:

- the friend records themselves — do Denis, Misha and Yulia carry any attribute at all (profession,
  employer, place, period, role)?
- is there any entity recorded that is "the mayor" — a person with that role, a city administration,
  a city hall, an office in Kazan?
- is any fact recorded whose subject is one of the three and whose scope is Kazan's administration
  in any form?

I expect this to come back with the three names and nothing else — no attributes, no mayor entity,
no overlap. That is empty **with respect to the question**: rows exist, but not one of them bears on
who could have known whom. Empty is what licenses the climb, and this is empty in that sense, not
merely thin.

One trap I handle here rather than later: Russian declension splits a person into two. "Мише дали
задание" and "Миша молодец" key as *mishe* and *misha*. So I look up each friend by the common stem
of the key, not by one exact form, before I conclude that a friend has nothing recorded. A friend who
looks empty because half his facts sit under a second key would send me up the ladder for nothing.

## Level 2 — the database with one model call, no history

Empty below, so I climb. One call, one turn: I hand the model the recorded material — this person,
their three friends, whatever attributes the level-one lookup actually returned — and ask whether
anything in it connects any friend to a mayor or a city administration.

I expect the honest answer to be no, and I want it to be no rather than something. With no profession
and no employer for any of the three, the only way the model can produce a name is by inventing a
reason — "Denis is a common name for a man of business age in a city of a million, he could plausibly
have crossed paths with the administration". That is a fabricated answer wearing the shape of a real
one, and it costs the person more than silence. If the model comes back with a candidate, I require
it to name the recorded fact it rests on; no fact, no candidate.

## Level 3 — relations, plus reasoning over what they return

Still empty, so I climb once more — and this is my last step.

I ask the relation store for paths between each friend and anything mayor-shaped: the mayor as a
person, the city administration, the city hall, Kazan's municipal bodies, and any third entity that
sits between a friend and one of those. I supply the keywords myself — the names, the role words, the
city — because a relation query sent without them triggers a hidden model call on every read, and that
is a cost the caller never agreed to pay. I ask the short, name-bearing question by relations; I do not
paraphrase it into a long sentence, since relations match on names and case, not on meaning.

Then I reason over what comes back. If a path exists — Yulia worked in an organisation that the
administration is also tied to, say — I report her with the path itself, so the person can judge the
link rather than trust my verdict. If nothing comes back, level three is empty too, and that is where
I stop.

## Where I stop, and why not further

I stop at three. The vector store (four) and the recursive loop (five) would be the obvious next
move — they are exactly the tools that find a faint semantic connection where names fail — and they
are not mine to reach for. Opening them uninvited turns a cheap answer into a slow one and spends the
caller's seconds and quota on a decision they never made. So I do not open them; I tell the caller
they exist and that one word from them opens the fourth.

If any of the three levels turns out not to be built in this installation — no relation store
reachable, for instance — I say so by name instead of quietly answering from the level below. A
missing capability reported as a boundary is useful; the same gap reported as silence reads as "there
is nothing", which is a different and false claim.

## What I return to the caller

**The depth line, and it states the fact rather than the request.** No depth was asked for; the depth
reached is **three**, and the search on it came back empty. I name the three levels I actually used
(plain lookup, one model call, relations) and name explicitly that four and five were not opened
because the caller did not request them and I do not open them on my own. If a level had answered
sooner — if level one had held a workplace for Yulia — the reported number would have been one, and
that would have been good news, not a shortfall.

**The answer, and it is an empty one stated as a real answer.** Nothing recorded connects Denis,
Misha or Yulia to the mayor. That is not "none of them could have known him" — it is "I have no
professions, no employers and no history for any of the three, so there is nothing here that could
carry such a connection either way". I name the gap that produced the emptiness, because it is the
useful part: one recorded workplace or role for any of the three would make this question answerable
on level one next time. And I offer the fourth level as the caller's call, priced in seconds, not as
something I have already begun.

**The answer text goes to the person in Russian**, since that is their recorded language; the depth
report is for the caller, not for them.

What I do not return: a plausible name. With three friends and no facts, guessing has a one-in-three
chance of looking right and a certainty of being unfounded, and the person would act on it.
