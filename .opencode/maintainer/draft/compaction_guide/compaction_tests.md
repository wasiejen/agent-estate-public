

# testin start 2026-09-26

opencode.json values at beginning:
    "tokens": 30000,
    "messages": 22


ses_f20b3bf14ffedWHp2HGajHmGLN keep=30m tok=15916 (old compute version v1); after compaction 35k, loaded 61k

  --comment: reworked keepToken calc (computeKeepTokens) in .opencode\plugin\compaction_core.ts 2 times
  total_token after each message is always in+out+cache(cr)
  "info.tokens: {input, output, cache.read}")
  (see knowledge_inbox.md ## 2026-09-27_00-23 planner_Q3S_245K_slow ses_f20b3bf14ffedWHp2HGajHmGLN)
  --todo: gauge needs to be updated to the same calc based on in+out+cr and thus should then only lag one tool call behind and no longer 2 (lacks the out (generated token of last message) part currently it seems) 
    - might already be the last todo by a fork of planner-24

ses_f2075495bffe7lStkgBCtle9Uf keep=10m tok=5543, after compaction 25k token, loaded until active 56k token
ses_f2025e999ffeltUSaTafXQ6y2S keep=12m tok=10661, after compaction 25k, loaded 56k

# testing continuation 2026-09-27

ses_f1e0ff3c2fferuiucMot42aF3M keep=30m tok=44865, after compaction 25k, loaded 56k

keepToken seems to not have any effect at all
- overwritten by defaults in opencode.json?
- commented out both keepToken and keepMessages in opencode.json
    //"tokens": 30000,
    //"messages": 22

--- restarted opencode

ses_f1e061042ffeHdnNvr7nzAdAtz keep=30m tok=44878; after 35k, loaded 42k

- so definitely the opencode.json settings were respected instead of the supplied keepToken
- set "tokens": 44878, in opencode.json
    "tokens": 44878,
    //"messages": 30

ses_f1e0052abffeCyKVV3fkGh5AW8 keep=30m tok=45056, after compaction 35k, loaded 42k

- i no longer know what to think about this at all.

    // "tokens": 44878,
    "messages": 30

ses_f1dfadca9ffe3d8HSretcFpKk2 keep=30m tok=44857, after compaction 34.3k, loaded 42k

- why?

    "tokens": 44878,
    "messages": 30

ses_f1df63454ffetsFTJxpxIiaOQ3 keep=30m tok=44903, after compaction 35.1k, loaded 42.7k

- so no influence of the settings in opencode.json? but it changed something on first commenting out. but not back again on ..
- i am dump .. i forgot to restart opencode after commenting out both.
- so all tests were with commented out keep values again and again.. this explains the same numbers.


    "tokens": 44878,
    //"messages": 30
--- restarted opencode

#9 ses_f1df17493ffes8167PNT5WPcZP keep=30m tok=45458, after compaction 14.6k, loaded 68k

      //"tokens": 44878,
      "messages": 30
--- restarted opencode

#10 ses_f1de9ff3dffev2LxstI2wSn2Aj keep=30m tok=45088, after compaction 35k, after 42.6k

- so keepMessages in opencode.json is ignored
- only keepToken is recogniced and the value in opencode.json is used for all. the compact_memory keep settings do not take effect at all

-keeptoken might round up/down internally to the next full message it lands in? thus 56k (keeptoken 30k) to 68k (keeptoken 44878) -> diff 12/13k


quote script from planner-14 keep 16k fork:

  $ node -e "
  const { DatabaseSync } = require('node:sqlite');
  const db = new DatabaseSync('home/.local/share/opencode/opencode.db', { readOnly: true });
  const SID = 'ses_f20b3bf14ffedWHp2HGajHmGLN';
  const msgs = db.prepare('SELECT id, data FROM message WHERE session_id = ? ORDER BY time_created ASC, rowid ASC').all(SID);
  const A = []; // assistant rows only, in order: [idx, in, out, cr]
  msgs.forEach((m, i) => { const d = JSON.parse(m.data); if (d.role === 'assistant') A.push({ i, in: d.tokens?.input ?? 0, out: d.tokens?.output ?? 0, cr: d.tokens?.cache?.read ?? 0 }); });
  console.log('i  S=in+out+cr   cr[next-asst]   drift');
  for (let k = 0; k + 1 < A.length; k++) {
    const S = A[k].in + A[k].out + A[k].cr;
    const crn = A[k + 1].cr;
    console.log(String(A[k].i).padStart(3) + '  ' + String(S).padStart(8) + '   ' + String(crn).padStart(9) + '   ' + (S - crn));
  }
  const s = (idx) => { const a = A.find(x => x.i === idx); return a.in + a.out + a.cr; };
  console.log('S[54]-S[43] =', s(54) - s(43), '(last-11 msg mass)');
  console.log('S[43]-S[32] =', s(43) - s(32), '(fork-test last-12 window: msg 33..44)');
  console.log('S[54]-S[42] =', s(54) - s(42), '(crosses fork point 44/45)');
  "
  i  S=in+out+cr
  1     23826
  2     26931
  3     63381
  4     86842
  5     92745
  6    108568
  7    112223
  8    112460
  9    113050
  10    118526
  11    119013
  12    121563
  13    122095
  14    122413
  15    123195
  16    124393
  17    127755
  18    128067
  19    128719
  20    129413
  21    132603
  22    133823
  23    134146
  24    134333
  25    134998
  26    135370
  27    135689
  28    136283
  29    136521
  30    136625
  31    137248
  32    138448
  33    140277
  34    140406
  35    140730
  36    141762
  37    142294
  38    144113
  39    145663
  40    146208
  41    146939
  42    147309
  43    147906
  45    150482


fork point is step/msg 44 -> thus incorrectly displayed
43    147906
- 30 messages lands than somewher at point 13/14
13    122095
14    122413

TLDR: current compact_memory implementation does not change the keep settings. these are always taken from opencode.json keep.tokens. keep.messages in opencode.json is ignored as expected.
-> so how to correctly input keep.token into the summerize function

TUI display for after compaction is highly unreliable - so we should not base the expected floor on this. only what is prefilled on loading the context after compaction and can be measured via gauge should be taken into account.

    "tokens": 1, /deliberately not used 0 because i think 0 is automatic? keeptken system?
    //"messages": 30
--- opencode restarted

#11 ses_f1dd756c1ffeeTw9uqEv0G0592 keep=30m tok=45005, after compaction 49.9k, loaded 25.8k
- lets define this as the floor: 25.8k
  - +45 is roughly 72k, so there is some rounding done, or a minimum of keeptoken is already in the 25.8k (so around 4k is default to be kept? or is the summery counting into the keeptoken budged?)

      "tokens": 0,
      //"messages": 30
--- opencode restarted

#12 ses_f1dd359cdffe431xN2YbtC3FQa keep=30m tok=45103, after compaction 49.9k, loader 25.9k

- so 25.8k/25.9k is the ground floor currently (system prompt + summery)
- "tokens": 0 -> activates no automatic system to determine keepToken on its own
